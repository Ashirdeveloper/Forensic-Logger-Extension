# Incognito Forensic Logger Extension

## Summary

This Chrome extension, "Incognito Forensic Logger", captures and displays browsing activity that occurs in Chrome's Incognito windows when the user enables the extension for incognito use. It provides a simple popup UI to view recent entries, export collected data as JSON or CSV, and clear stored logs. The tool is intended for testing and controlled forensic analysis only not for unauthorized monitoring and stores data locally using the extension storage APIs. Note: users must enable "Allow in incognito" on the extension's details page to collect logs in private windows.

## Steps to Load Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `chrome_extension` folder.
4. After loading, click "Details" on the extension.
5. Enable "Allow in incognito" to allow the extension to run in private windows.
6. Open an Incognito window and browse test sites.
7. Click the extension icon to open the popup and view/export logs.

## Testing Checklist

- [ ] Extension loads without errors.
- [ ] Popup opens and shows "Extension enabled (allow in incognito)".
- [ ] Browsing in incognito captures logs (check console for any errors).
- [ ] "Show logs" displays last 10 entries.
- [ ] "Export JSON" downloads `browsing_log.json`.
- [ ] "Export CSV" downloads `browsing_log.csv`.
- [ ] "Clear logs" removes all logs.

## Common Errors

- If logs are not captured, ensure "Allow in incognito" is enabled.
- Check console for API permission errors in incognito.
- Ensure Manifest V3 is supported in your Chrome version.
