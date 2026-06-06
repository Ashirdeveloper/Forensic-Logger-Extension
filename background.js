// Global variables for managing logs
let logId = 0;
const MAX_LOGS = 1000;
let logs = [];
let isInitialized = false;
let saveTimeout = null;

// Enhanced keep-alive system to prevent service worker sleep
function setupKeepAlive() {
  chrome.alarms.create('keepAlive', { periodInMinutes: 2 });
  chrome.alarms.create('backupSave', { periodInMinutes: 1 });
  chrome.alarms.create('stateCheck', { periodInMinutes: 0.5 });
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'backupSave') {
      saveLogsToStorage('Periodic backup');
    } else if (alarm.name === 'stateCheck') {
      verifyStorage();
    }
  });
}

// Verify storage integrity
function verifyStorage() {
  chrome.storage.local.get(['incognito_logs', 'log_id'], (result) => {
    if (chrome.runtime.lastError) {
      return;
    }
    
    const storedLogs = result.incognito_logs || [];
    const storedId = result.log_id || 0;
    
    if (storedLogs.length !== logs.length || storedId !== logId) {
      saveLogsToStorage('Mismatch correction', true);
    }
  });
}

// Function to save logs to storage with error handling and debouncing
function saveLogsToStorage(reason, immediate = false) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  
  const performSave = () => {
    const dataToSave = {
      incognito_logs: logs,
      log_id: logId,
      last_save: Date.now()
    };
    
    chrome.storage.local.set(dataToSave, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage save error:', chrome.runtime.lastError);
      }
    });
  };
  
  if (immediate) {
    performSave();
  } else {
    saveTimeout = setTimeout(performSave, 500);
  }
}

// Enhanced initialization with better error handling
function initializeExtension() {
  if (isInitialized) {
    return;
  }
  
  chrome.storage.local.get(['incognito_logs', 'log_id', 'last_save'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Storage read error:', chrome.runtime.lastError);
      logs = [];
      logId = 0;
    } else {
      if (result.incognito_logs && Array.isArray(result.incognito_logs)) {
        logs = result.incognito_logs;
      } else {
        logs = [];
      }
      
      if (result.log_id !== undefined && result.log_id !== null) {
        logId = result.log_id;
      } else if (logs.length > 0) {
        logId = Math.max(...logs.map(log => log.id || 0));
      } else {
        logId = 0;
      }
    }
    
    isInitialized = true;
    saveLogsToStorage('Post-initialization', true);
  });
  
  setupKeepAlive();
}

// Load saved logs and setup keep-alive when extension starts
chrome.runtime.onStartup.addListener(() => {
  isInitialized = false;
  initializeExtension();
});

chrome.runtime.onInstalled.addListener((details) => {
  isInitialized = false;
  initializeExtension();
});

// Initialize immediately when service worker starts
initializeExtension();

// Enhanced function to add a new log entry
function addLog(url, title, tabId, windowId, incognito) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }
  
  if (!isInitialized) {
    setTimeout(() => addLog(url, title, tabId, windowId, incognito), 100);
    return;
  }
  
  const now = new Date();
  const logEntry = {
    id: ++logId,
    url: url,
    title: title || 'No title',
    timestamp_utc: now.toISOString(),
    epoch_ms: Date.now(),
    tabId: tabId,
    windowId: windowId,
    incognito: incognito
  };
  
  logs.push(logEntry);
  
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  saveLogsToStorage('New log added');
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.windows.get(tab.windowId, (window) => {
      if (chrome.runtime.lastError) {
        return;
      }
      addLog(tab.url, tab.title, tabId, tab.windowId, window.incognito);
    });
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return;
    }
    
    if (tab && tab.url) {
      chrome.windows.get(tab.windowId, (window) => {
        if (chrome.runtime.lastError) {
          return;
        }
        addLog(tab.url, tab.title, tab.id, tab.windowId, window.incognito);
      });
    }
  });
});

// Listen for web navigation
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return;
      }
      
      if (tab) {
        chrome.windows.get(tab.windowId, (window) => {
          if (chrome.runtime.lastError) {
            return;
          }
          addLog(details.url, tab.title, details.tabId, tab.windowId, window.incognito);
        });
      }
    });
  }
}, { url: [{ schemes: ['http', 'https'] }] });

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLogs') {
    const recentLogs = logs.slice(-10);
    sendResponse({ logs: recentLogs });
  } else if (request.action === 'export') {
    sendResponse({ success: true, data: logs, format: request.format });
  } else if (request.action === 'clearLogs') {
    logs = [];
    logId = 0;
    saveLogsToStorage('After clear', true);
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse({ 
      tracking: true, 
      totalLogs: logs.length,
      serviceWorker: 'active',
      maxLogs: MAX_LOGS,
      memoryUsage: JSON.stringify(logs).length,
      initialized: isInitialized,
      currentLogId: logId
    });
  } else if (request.action === 'getStats') {
    sendResponse({ success: true, allLogs: logs });
  } else if (request.action === 'debug') {
    sendResponse({ 
      success: true, 
      logsCount: logs.length,
      logId: logId,
      state: 'active',
      initialized: isInitialized
    });
  }
  
  return true;
});

// Before service worker terminates, save everything
self.addEventListener('beforeunload', () => {
  saveLogsToStorage('Before termination', true);
});