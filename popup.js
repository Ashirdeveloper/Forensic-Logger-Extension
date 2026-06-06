// Initialize the popup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Request logs from the background script and display them
  chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
    displayLogs(response.logs);
  });

  // Event listener for the 'Show Logs' button to refresh and display logs
  document.getElementById('showLogs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
      displayLogs(response.logs);
    });
  });

  // Event listener for the 'Export JSON' button to export logs as JSON
  document.getElementById('exportJson').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'export', format: 'json' }, (response) => {
      if (response.success) {
        const data = response.data;
        // Create a blob for the JSON data
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // Download the JSON file
        chrome.downloads.download({
          url: url,
          filename: 'browsing_log.json',
          saveAs: false
        });
      }
    });
  });

  // Event listener for the 'Export CSV' button to export logs as CSV
  document.getElementById('exportCsv').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'export', format: 'csv' }, (response) => {
      if (response.success) {
        const data = response.data;
        // Generate CSV string from log data
        const csv = 'id,url,title,timestamp_utc,epoch_ms,tabId,windowId,incognito\n' +
          data.map(log => `${log.id},"${log.url}","${log.title || ''}",${log.timestamp_utc},${log.epoch_ms},${log.tabId},${log.windowId},${log.incognito}`).join('\n');
        // Create a blob for the CSV data
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        // Download the CSV file
        chrome.downloads.download({
          url: url,
          filename: 'browsing_log.csv',
          saveAs: false
        });
      }
    });
  });

  // Event listener for the 'Clear Logs' button to clear all logs
  document.getElementById('clearLogs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearLogs' }, () => {
      // Clear the logs preview in the popup and reset stats
      document.getElementById('logsPreview').innerHTML = '';
      updateStats([]);
    });
  });
});

// Function to display statistics
function updateStats(logs) {
  const totalLogs = logs.length;
  const incognitoLogs = logs.filter(log => log.incognito).length;
  const normalLogs = totalLogs - incognitoLogs;
  
  document.getElementById('totalLogs').textContent = totalLogs;
  document.getElementById('incognitoLogs').textContent = incognitoLogs;
  document.getElementById('normalLogs').textContent = normalLogs;
}

// Function to display the last 10 logs in the popup preview
function displayLogs(logs) {
  const preview = document.getElementById('logsPreview');
  preview.innerHTML = '';
  
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = log.incognito ? 'incognito' : 'normal';
    div.textContent = `${log.incognito ? '🕵️' : '🌐'} ${log.url} - ${new Date(log.timestamp_utc).toLocaleTimeString()}`;
    preview.appendChild(div);
  });
  
  // Update statistics - need to get ALL logs for accurate stats
  chrome.runtime.sendMessage({ action: 'export', format: 'json' }, (response) => {
    if (response.success) {
      updateStats(response.data);
    }
  });
}