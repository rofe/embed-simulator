// Temporary storage for embed handling
window.aemEmbeds = window.aemEmbeds || {};
window.aemEmbeds.isPickerMode = false;

// Create overlay div
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'aem-highlight-overlay';
  overlay.style.position = 'absolute';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9999';
  overlay.style.borderTop = '2px solid #2680eb';
  overlay.style.transition = 'all 0.1s ease';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.dropShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

  const tag = document.createElement('span');
  tag.style.height = '24px';
  tag.style.color = 'white';
  tag.style.padding = '4px 8px';
  tag.style.borderBottomLeftRadius = '4px';
  tag.style.borderBottomRightRadius = '4px';
  tag.style.fontSize = '12px';
  tag.style.lineHeight = '1';
  tag.style.fontFamily = 'Arial, sans-serif';
  tag.textContent = 'Embed';
  overlay.appendChild(tag);
  document.body.appendChild(overlay);
  return overlay;
}

// Update overlay position and size
function updateOverlay(element, isSelected = false) {
  let highlightOverlay = document.getElementById('aem-highlight-overlay');
  if (!highlightOverlay) {
    highlightOverlay = createOverlay();
  }

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  highlightOverlay.style.top = `${rect.top + scrollY}px`;
  highlightOverlay.style.left = `${rect.left + scrollX}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.borderTop = `2px solid ${isSelected ? '#2d9d78' : '#2680eb'}`;

  let tag = element.id ? `#${element.id}` : element.tagName.toLowerCase();
  if (element.classList.length > 0) {
    tag = `${tag}.${[...element.classList].join('.')}`;
  }
  const tagElem = highlightOverlay.firstElementChild;
  tagElem.textContent = tag;
  tagElem.style.backgroundColor = isSelected ? '#2d9d78' : '#2680eb';
}

// Remove overlay
function removeOverlay() {
  const highlightOverlay = document.getElementById('aem-highlight-overlay');
  if (highlightOverlay) {
    highlightOverlay.remove();
  }
}

function startPickerMode() {
  window.aemEmbeds.isPickerMode = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
}

function stopPickerMode() {
  window.aemEmbeds.isPickerMode = false;
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  removeOverlay();
  delete window.aemEmbeds.highlightedElementSelector;
  delete window.aemEmbeds.selectedElementSelector;
}

function handleMouseMove(e) {
  if (!window.aemEmbeds.isPickerMode) return;

  const element = document.elementFromPoint(e.clientX, e.clientY);
  const highlightedElement = document.querySelector(window.aemEmbeds.highlightedElementSelector);
  if (!element || element === highlightedElement) return;

  window.aemEmbeds.highlightedElementSelector = generateSelector(element);
  updateOverlay(element);
}

function generateSelector(elem) {
  const {
    tagName,
    id,
    className,
    parentElement,
  } = elem;

  let str = tagName.toLowerCase();

  if (str === 'html') {
    return str;
  }

  str += (id !== '') ? `#${id}` : '';

  if (className) {
    const classes = className.split(/\s/);
    for (let i = 0; i < classes.length; i++) {
      str += `.${classes[i]}`;
    }
  }

  let childIndex = 1;

  for (let e = elem; e.previousElementSibling; e = e.previousElementSibling) {
    childIndex += 1;
  }

  str += `:nth-child(${childIndex})`;

  return `${generateSelector(parentElement)} > ${str}`;
}

function handleClick(e) {
  if (!window.aemEmbeds.isPickerMode) return;

  e.preventDefault();
  e.stopPropagation();

  const highlightedElement = document.querySelector(window.aemEmbeds.highlightedElementSelector);
  if (highlightedElement) {
    window.aemEmbeds.selectedElementSelector = generateSelector(highlightedElement);
    updateOverlay(highlightedElement, true);

    // Send message to popup
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      selector: generateSelector(highlightedElement),
    });

    // Don't reset picker mode here - let the popup handle it
    window.aemEmbeds.isPickerMode = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick);
  }
}

function removeEmbed(embedId) {
  const iframe = document.getElementById(`aem-embed-${embedId}`);
  if (iframe) {
    iframe.remove();
  } else {
    console.log('deleteEmbed: no iframe found with ID:', `aem-embed-${embedId}`);
  }
}

if (!window.aemEmbeds.placeEmbedsInitialized) {
  // Listen for messages from popup or service worker
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
    case 'startPickerMode':
      startPickerMode();
      break;
    case 'stopPickerMode':
      stopPickerMode();
      break;
    case 'removeEmbed':
      removeEmbed(request.embedId);
      break;
    }
  });
  window.aemEmbeds.placeEmbedsInitialized = true;
}
