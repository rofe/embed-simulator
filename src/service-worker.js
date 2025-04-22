// Service Worker for the Embed Simulator extension

function applyEmbeds(tabId) {
  // Check if extension is paused
  chrome.storage.local.get(['isPaused'], async ({ isPaused }) => {
    if (isPaused) {
      console.log('Extension is paused, skipping embed application');
      return;
    }

    // Get the current embeds configuration and send it to the active tab
    chrome.storage.local.get({ embeds: [] }, async ({ embeds }) => {
      if (!embeds || (Array.isArray(embeds) && embeds.length === 0)) {
        return;
      }
      // eslint-disable-next-line no-param-reassign
      tabId = tabId || await new Promise((resolve) => {
        chrome.tabs.query(({ active: true, currentWindow: true }), (tabs) => {
          if (tabs[0] && tabs[0].id) {
            resolve(tabs[0].id);
          } else {
            resolve(null);
          }
        });
      });

      try {
        // execute content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['./apply-embeds.js'],
        });
        // send message to content script
        await chrome.tabs.sendMessage(tabId, {
          action: 'applyEmbeds',
          embeds,
        });
      } catch (error) {
        console.info('Error applying embeds:', error);
      }
    });
  });
}

// Store the last selected element data
let lastSelector = null;

// Listen for tab URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log('Tab URL updated:', tab.url);
    applyEmbeds(tabId, true);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    console.log('Tab activated:', tab.url);
    applyEmbeds(tabId);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);

  if (namespace === 'local' && changes.embeds) {
    console.log('Embeds configuration changed, applying to current tab');

    // Get the current active tab and send the embeds to it
    applyEmbeds();
  }

  if (namespace === 'local' && changes.isPaused) {
    console.log('Paused state changed, applying to current tab');
    applyEmbeds();
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // eslint-disable-next-line default-case
  switch (request.action) {
    case 'elementSelected':
      if (request.selector) {
        console.log('Storing selected element data');
        lastSelector = request.selector;
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
