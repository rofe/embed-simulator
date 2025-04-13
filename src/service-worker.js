// Service Worker for the Embed Simulator extension

function applyEmbeds(tabId, delay) {
  // Get the current embeds configuration
  chrome.storage.local.get({ embeds: [] }, function (result) {
    function doApplyEmbeds() {
      console.log('Applying embeds to tab:', tabId);
      try {
        chrome.tabs.sendMessage(tabId, {
          action: 'applyEmbeds',
          embeds: result.embeds
        });
      } catch (error) {
        console.log('Error applying embeds:', error);
      }
    }
    if (result.embeds.length > 0) {
      if (delay) {
        console.log('Waiting 500ms before applying embeds');
        setTimeout(doApplyEmbeds, 500);
      } else {
        doApplyEmbeds();
      }
    }
  });

}
// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Embed Simulator extension installed');
});

// Store the last selected element data
let lastSelector = null;

// Listen for tab URL updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log('Tab URL updated:', tab.url);
    applyEmbeds(tabId, true);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log('Tab activated:', activeInfo.tabId);
  applyEmbeds(activeInfo.tabId);
});

// Listen for storage changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log('Storage changed:', changes);

  if (namespace === 'local' && changes.embeds) {
    console.log('Embeds configuration changed, applying to current tab');

    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        console.log('Sending applyEmbeds message to tab:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'applyEmbeds',
          embeds: changes.embeds.newValue
        });
      }
    });
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Service worker received message:', request);
  switch (request.action) {
    case 'elementSelected':
      if (request.selector) {
        console.log('Storing selected element data');
        lastSelector = request.selector,
        // Open the popup
        console.log('Opening popup in configure state');
        chrome.action.openPopup(() => {
          console.log('Popup opened');
        });
      }
      break;
    case 'getSelectedElement':
      console.log('Sending selected element data to popup', lastSelector);
      sendResponse({
        selector: lastSelector,
      });
      lastSelector = null; // Clear the data after sending
      break;
  }

  return true; // Required for async sendResponse
});