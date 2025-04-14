// UI States
const UI_STATE = {
  INITIAL: 'initial',
  PICKER: 'picker',
  CONFIGURE: 'configure'
};

let currentState = UI_STATE.INITIAL;
let selector = null;
let currentTabUrl = null;
let currentTabId = null;

// Initialize the popup
function initializePopup() {
  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    currentTabUrl = tabs[0].url;
    currentTabId = tabs[0].id;

    // execute content script
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['./place-embeds.js'],
    });

    // Check if we have a selected element from the service worker
    chrome.runtime.sendMessage({action: 'getSelectedElement'}, function(response) {
      if (response) {
        selector = response.selector;
        currentState = selector ? UI_STATE.CONFIGURE : UI_STATE.INITIAL;
      }
      updateUI();
    });
  });

}

function matchUrl(currentUrl, tabUrl) {
  if (tabUrl.endsWith('*')) {
    // wildcard match
    return currentUrl.startsWith(tabUrl.slice(0, -1));
  }
  // exact match without hash
  return currentUrl.split('#')[0] === tabUrl.split('#')[0];
}

// Update UI based on current state
async function updateUI() {
  const embedControls = document.getElementById('embedControls');
  embedControls.innerHTML = '';

  switch (currentState) {
    case UI_STATE.CONFIGURE:
      embedControls.innerHTML = `
        <h2>Add Embed</h2>
        <div class="form-group">
          <label for="embedUrl" class="required">Embed URL</label>
          <input type="url" id="embedUrl" class="spectrum-Textfield" required>
        </div>
        <div class="form-group-collapsible">
          <label for="targetUrl">Target URL (<code>*</code> suffix supported)</label>
          <input type="text" id="tabUrl" class="spectrum-Textfield" value="${currentTabUrl}">
        </div>
        <div class="form-group">
          <label for="embedName">Name</label>
          <input type="text" id="embedName" class="spectrum-Textfield" placeholder="Embed n">
          <label for="embedHeight">Width</label>
          <input type="text" id="embedWidth" class="spectrum-Textfield" placeholder="Automatic">
          <label for="embedHeight">Height</label>
          <input type="text" id="embedHeight" class="spectrum-Textfield" placeholder="Automatic">
        </div>
        <div class="form-button-group">
          <button id="confirmEmbed" class="spectrum-Button spectrum-Button--primary" disabled>Confirm</button>
          <button id="cancelConfigure" class="spectrum-Button spectrum-Button--secondary">Cancel</button>
        </div>
      `;

      const embedUrlInput = document.getElementById('embedUrl');
      const confirmButton = document.getElementById('confirmEmbed');
      const cancelButton = document.getElementById('cancelConfigure');

      embedUrlInput.addEventListener('input', () => {
        console.log('Embed URL input changed:', embedUrlInput.value);
        confirmButton.disabled = !embedUrlInput.value.trim();
      });
      embedUrlInput.focus();

      document.querySelectorAll('.form-group-collapsible').forEach((group) => {
        group.addEventListener('click', () => {
          group.classList.toggle('expanded');
        });
      });

      confirmButton.addEventListener('click', saveEmbed);
      cancelButton.addEventListener('click', resetToInitialState);
      break;

    case UI_STATE.PICKER:
      // Send message to content script to start picker mode
      console.log('Sending startPickerMode message to tab:', currentTabId);
      chrome.tabs.sendMessage(currentTabId, { action: 'startPickerMode' });

      // Close the popup window
      console.log('Closing popup window to allow page interaction');
      window.close();
      break;

    default:
      // Get existing embeds for current URL
      chrome.storage.local.get({ embeds: [] }, function (result) {
        const currentEmbeds = result.embeds.filter(embed => matchUrl(currentTabUrl, embed.tabUrl));

        let embedsList = '';
        if (currentEmbeds.length > 0) {
          embedsList = `
            <div class="embeds-list">
              ${currentEmbeds.map(({ embedName, embedUrl }, index) => {
                return `
                <div class="embed-card embed-card-${index}">
                  <div class="embed-card-content">
                    <div class="embed-card-title">${embedName}</div>
                    <div class="embed-card-details">
                      <div class="embed-card-url">${embedUrl}</div>
                    </div>
                  </div>
                  <button class="embed-card-delete" data-index="${index}">&times;</button>
                </div>
              `;
              }).join('')}
            </div>
          `;
        }

        embedControls.innerHTML = `
          <button id="addEmbed" class="spectrum-Button spectrum-Button--primary">Add Embed</button>
          ${currentEmbeds.length > 0 ? '<hr class="spectrum-Divider spectrum-Divider--sizeM">' : ''}
          ${embedsList}
        `;

        // Add delete button event listeners
        document.querySelectorAll('.embed-card-delete').forEach(button => {
          button.addEventListener('click', function () {
            const index = parseInt(this.dataset.index);
            removeEmbed(index);
          });
        });

        document.getElementById('addEmbed').addEventListener('click', startPickerMode);
      });
  }
}

// Delete an embed
function removeEmbed(index) {
  chrome.storage.local.get({embeds: []}, function(result) {
    const embeds = result.embeds;
    const currentEmbeds = embeds.filter((embed) => matchUrl(currentTabUrl, embed.tabUrl));

    if (index >= 0 && index < currentEmbeds.length) {
      const embedToDelete = embeds[index];
      embeds.splice(index, 1);

      // Send message to content script to remove the iframe
      chrome.tabs.sendMessage(currentTabId, {
        action: 'removeEmbed',
        embedId: embedToDelete.id
      });

      chrome.storage.local.set({embeds}, function() {
        console.log('Embed deleted, updating UI');
        updateUI();
      });
    }
  });
}

// Start picker mode
function startPickerMode() {
  currentState = UI_STATE.PICKER;
  updateUI();
}

// Reset to initial state
function resetToInitialState() {
  currentState = UI_STATE.INITIAL;
  selector = null;

  // Remove highlight overlay
  chrome.tabs.sendMessage(currentTabId, {
    action: 'stopPickerMode'
  });

  updateUI();
}

// Save embed configuration
function saveEmbed() {
  console.log('Saving embed configuration...');
  const embedUrl = document.getElementById('embedUrl').value.trim();
  if (!embedUrl) {
    console.log('No embed URL provided, skipping save');
    return;
  }

  const tabUrl = document.getElementById('tabUrl').value.trim();
  const embedName = document.getElementById('embedName').value.trim();
  const embedWidth = document.getElementById('embedWidth').value.trim();
  const embedHeight = document.getElementById('embedHeight').value.trim();

  // Save configuration
  chrome.storage.local.get({embeds: []}, function(result) {
    console.log('Current embeds:', result.embeds);
    const embeds = result.embeds || [];

    // Find the next available ID
    const nextId = embeds.length > 0
      ? Math.max(...embeds.map(e => e.id || 0)) + 1
      : 1;

    const newEmbed = {
      id: nextId,
      tabUrl,
      selector,
      embedName: embedName || `Embed ${nextId}`,
      embedWidth: embedWidth || '100%',
      embedHeight: embedHeight || '110px',
      embedUrl,
    };

    embeds.push(newEmbed);

    chrome.storage.local.set({embeds}, function() {
      console.log('Saved new embed configuration:', newEmbed);
      // Remove highlight overlay before closing
      chrome.tabs.sendMessage(currentTabId, {
        action: 'stopPickerMode'
      });
      // Close the popup instead of resetting to initial state
      console.log('Closing popup');
      window.close();
    });
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', initializePopup);
