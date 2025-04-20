import matchUrl from './utils.js';

// UI States
const UI_STATE = {
  INITIAL: 'initial',
  PICKER: 'picker',
  CONFIGURE: 'configure',
  EDIT: 'edit',
};

let currentState = UI_STATE.INITIAL;
let selector = null;
let currentTabUrl = null;
let currentTabId = null;
let editingEmbed = null;

// Start picker mode
function startPickerMode() {
  currentState = UI_STATE.PICKER;
  // eslint-disable-next-line no-use-before-define
  updateUI();
}

// Reset to initial state
function resetToInitialState() {
  currentState = UI_STATE.INITIAL;
  selector = null;

  // Remove highlight overlay
  chrome.tabs.sendMessage(currentTabId, {
    action: 'stopPickerMode',
  });

  // eslint-disable-next-line no-use-before-define
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
  chrome.storage.local.get({ embeds: [] }, (result) => {
    console.log('Current embeds:', result.embeds);
    const embeds = result.embeds || [];

    // Find the next available ID
    const nextId = embeds.length > 0
      ? Math.max(...embeds.map((e) => e.id || 0)) + 1
      : 1;

    const newEmbed = {
      id: nextId,
      tabUrl,
      selector,
      embedName: embedName || `Embed ${nextId}`,
      embedWidth,
      embedHeight,
      embedUrl,
    };

    embeds.push(newEmbed);

    chrome.storage.local.set({ embeds }, () => {
      console.log('Saved new embed configuration:', newEmbed);
      // Remove highlight overlay before closing
      chrome.tabs.sendMessage(currentTabId, {
        action: 'stopPickerMode',
      });
      // Close the popup instead of resetting to initial state
      console.log('Closing popup');
      window.close();
    });
  });
}

// Delete an embed
function removeEmbed(index) {
  chrome.storage.local.get({ embeds: [] }, (result) => {
    const { embeds } = result;
    const currentEmbeds = embeds.filter((embed) => matchUrl(currentTabUrl, embed.tabUrl));

    if (index >= 0 && index < currentEmbeds.length) {
      const embedToDelete = embeds[index];
      embeds.splice(index, 1);

      // Send message to content script to remove the iframe
      chrome.tabs.sendMessage(currentTabId, {
        action: 'removeEmbed',
        embedId: embedToDelete.id,
      });

      chrome.storage.local.set({ embeds }, () => {
        console.log('Embed deleted, updating UI');
        // eslint-disable-next-line no-use-before-define
        updateUI();
      });
    }
  });
}

// Update embed configuration
function updateEmbed() {
  console.log('Updating embed configuration...');
  const embedUrl = document.getElementById('embedUrl').value.trim();
  if (!embedUrl) {
    console.log('No embed URL provided, skipping update');
    return;
  }

  const tabUrl = document.getElementById('tabUrl').value.trim();
  const newSelector = document.getElementById('selector').value.trim();
  const embedName = document.getElementById('embedName').value.trim();
  const embedWidth = document.getElementById('embedWidth').value.trim();
  const embedHeight = document.getElementById('embedHeight').value.trim();

  // Update configuration
  chrome.storage.local.get({ embeds: [] }, (result) => {
    console.log('Current embeds:', result.embeds);
    const embeds = result.embeds || [];

    const index = embeds.findIndex((e) => e.id === editingEmbed.id);
    if (index !== -1) {
      const updatedEmbed = {
        ...editingEmbed,
        tabUrl,
        selector: newSelector,
        embedName: embedName || `Embed ${index + 1}`,
        embedWidth,
        embedHeight,
        embedUrl,
      };

      embeds[index] = updatedEmbed;
    }

    chrome.storage.local.set({ embeds }, () => {
      console.log('Updated embed configuration:', index);
      // Close the popup
      console.log('Closing popup');
      window.close();
    });
  });
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
          <label for="embedUrl" class="required">Embed URL*</label>
          <input type="url" id="embedUrl" class="spectrum-Textfield" placeholder="https://" pattern="https://.*" required>
          <input type="hidden" id="tabUrl" value="${currentTabUrl}">
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

      /* eslint-disable no-case-declarations */
      const embedUrlInput = document.getElementById('embedUrl');
      const confirmButton = document.getElementById('confirmEmbed');
      const cancelButton = document.getElementById('cancelConfigure');
      /* eslint-enable no-case-declarations */

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

    case UI_STATE.EDIT:
      embedControls.innerHTML = `
        <h2>Edit Embed</h2>
        <div class="form-group">
          <label for="embedUrl" class="required">Embed URL*</label>
          <input type="url" id="embedUrl" class="spectrum-Textfield" placeholder="https://" pattern="https://.*" required value="${editingEmbed.embedUrl}">
          <label for="embedName">Name</label>
          <input type="text" id="embedName" class="spectrum-Textfield" placeholder="Embed n" value="${editingEmbed.embedName}">
          <label for="targetUrl">Target URL (<code>*</code> suffix supported)</label>
          <input type="text" id="tabUrl" class="spectrum-Textfield" pattern="https://.*" value="${editingEmbed.tabUrl}">
          <label for="selector">Target Selector (insert before)</label>
          <input type="text" id="selector" class="spectrum-Textfield monospace" value="${editingEmbed.selector}">
          <label for="embedHeight">Width</label>
          <input type="text" id="embedWidth" class="spectrum-Textfield" placeholder="Automatic" value="${editingEmbed.embedWidth}">
          <label for="embedHeight">Height</label>
          <input type="text" id="embedHeight" class="spectrum-Textfield" placeholder="Automatic" value="${editingEmbed.embedHeight}">
        </div>
        <div class="form-button-group">
          <button id="updateEmbed" class="spectrum-Button spectrum-Button--primary">Update</button>
          <button id="cancelEdit" class="spectrum-Button spectrum-Button--secondary">Cancel</button>
        </div>
      `;

      document.getElementById('updateEmbed').addEventListener('click', updateEmbed);
      document.getElementById('cancelEdit').addEventListener('click', resetToInitialState);
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
      chrome.storage.local.get({ embeds: [] }, (result) => {
        const currentEmbeds = result.embeds
          .filter((embed) => matchUrl(currentTabUrl, embed.tabUrl));

        let embedsList = '';
        if (currentEmbeds.length > 0) {
          embedsList = `
            <div class="embeds-list">
              ${currentEmbeds.map((embed, index) => `
                <div class="embed-card embed-card-${index}" data-index="${index}">
                  <div class="embed-card-content">
                    <div class="embed-card-title">${embed.embedName}</div>
                    <div class="embed-card-details">
                      <div class="embed-card-url">${embed.embedUrl}</div>
                    </div>
                  </div>
                  <button class="embed-card-delete" data-index="${index}">&times;</button>
                </div>
              `).join('')}
            </div>
          `;
        }

        embedControls.innerHTML = `
          <button id="addEmbed" class="spectrum-Button spectrum-Button--primary">Add Embed</button>
          ${currentEmbeds.length > 0 ? '<hr class="spectrum-Divider spectrum-Divider--sizeM">' : ''}
          ${embedsList}
        `;

        // Add delete button event listeners
        document.querySelectorAll('.embed-card-delete').forEach((button) => {
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(button.dataset.index, 10);
            removeEmbed(index);
          });
        });

        // Add click handlers for embed cards
        document.querySelectorAll('.embed-card').forEach((card) => {
          card.addEventListener('click', () => {
            const index = parseInt(card.dataset.index, 10);
            editingEmbed = currentEmbeds[index];
            currentState = UI_STATE.EDIT;
            updateUI();
          });

          // Add hover handlers to show/hide highlight
          card.addEventListener('mouseenter', () => {
            const index = parseInt(card.dataset.index, 10);
            const embed = currentEmbeds[index];
            chrome.tabs.sendMessage(currentTabId, {
              action: 'showHighlight',
              embedId: embed.id,
            });
          });

          card.addEventListener('mouseleave', () => {
            const index = parseInt(card.dataset.index, 10);
            const embed = currentEmbeds[index];
            chrome.tabs.sendMessage(currentTabId, {
              action: 'hideHighlight',
              embedId: embed.id,
            });
          });
        });

        document.getElementById('addEmbed').addEventListener('click', startPickerMode);
      });
  }
}

// Initialize the popup
function initializePopup() {
  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    currentTabUrl = tabs[0].url;
    currentTabId = tabs[0].id;

    // execute content script
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['./manage-embeds.js'],
    });

    // Check if we have a selected element from the service worker
    chrome.runtime.sendMessage({ action: 'getSelectedElement' }, (response) => {
      if (response) {
        selector = response.selector;
        currentState = selector ? UI_STATE.CONFIGURE : UI_STATE.INITIAL;
      }
      updateUI();
    });
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', initializePopup);
