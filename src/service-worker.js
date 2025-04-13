// Service Worker for the Embed Simulator extension

async function doApplyEmbeds(tabId, embeds) {
  console.log('Applying embeds to tab:', tabId);
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'applyEmbeds',
      embeds,
    });
  } catch (error) {
    console.info('Error applying embeds:', error);
  }
}

function applyEmbeds(tabId, delay) {
  // Get the current embeds configuration
  chrome.storage.local.get({ embeds: [] }, (resp) => {
    if (!resp.embeds || (Array.isArray(resp.embeds) && resp.embeds.length === 0)) {
      return;
    }
    if (delay) {
      console.log('Waiting 500ms before applying embeds');
      setTimeout(() => doApplyEmbeds(tabId, resp.embeds), 500);
    } else {
      doApplyEmbeds(tabId, resp.embeds);
    }
  });

}

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
chrome.tabs.onActivated.addListener(async function ({ tabId }) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    console.log('Tab activated:', tab.url);
    applyEmbeds(tabId);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
  console.log('Storage changed:', changes);

  if (namespace === 'local' && changes.embeds) {
    console.log('Embeds configuration changed, applying to current tab');

    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        doApplyEmbeds(tabs[0].id, changes.embeds.newValue);
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
