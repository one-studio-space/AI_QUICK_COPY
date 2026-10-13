/**
 * AI Quick Copy v1.1
 * Responsibility: open the settings page from the toolbar icon.
 */

// Toolbar icon opens the settings page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
