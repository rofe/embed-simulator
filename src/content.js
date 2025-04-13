let isPickerMode = false;
let highlightedElement = null;
let selectedElement = null;
let highlightOverlay = null;

// Create overlay div
function createOverlay() {
  const overlay = document.createElement('div');
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
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
}

function startPickerMode() {
  isPickerMode = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
}

function stopPickerMode() {
  isPickerMode = false;
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  removeOverlay();
  highlightedElement = null;
  selectedElement = null;
}

function handleMouseMove(e) {
  if (!isPickerMode) return;

  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (!element || element === highlightedElement) return;

  highlightedElement = element;
  updateOverlay(element);
}

function generateSelector(elem) {
  console.log('generateSelector', elem);
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
  if (!isPickerMode) return;

  e.preventDefault();
  e.stopPropagation();

  if (highlightedElement) {
    selectedElement = highlightedElement;
    updateOverlay(selectedElement, true);

    // Send message to popup
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      selector: generateSelector(selectedElement),
    });

    // Don't reset picker mode here - let the popup handle it
    isPickerMode = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick);
  }
}

function applyEmbeds(embeds) {
  const currentUrl = window.location.href;

  embeds.forEach(embed => {
    if (embed.tabUrl === currentUrl && !document.getElementById(`embed-${embed.id}`)) {
      const element = document.querySelector(embed.selector);
      if (element) {
        // Create embed iframe
        const iframe = document.createElement('iframe');
        iframe.id = `aem-embed-${embed.id}`;
        iframe.src = embed.embedUrl;
        iframe.dataset.embedName = embed.embedName;
        iframe.style.width = embed.width || '100%';
        iframe.style.height = embed.height || '110px';
        iframe.style.border = 'none';

        // insert iframe before selected element
        element.parentNode.insertBefore(iframe, element);
      } else {
        console.log('applyEmbeds: no element found for selector:', embed.selector);
      }
    }
  });
}

function removeEmbed(embedId) {
  const iframe = document.getElementById(`aem-embed-${embedId}`);
  if (iframe) {
    iframe.remove();
  } else {
    console.log('deleteEmbed: no iframe found with ID:', `aem-embed-${embedId}`);
  }
}

// Listen for messages from popup or service worker
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case 'startPickerMode':
      startPickerMode();
      break;
    case 'stopPickerMode':
      stopPickerMode();
      break;
    case 'applyEmbeds':
      applyEmbeds(request.embeds);
      break;
    case 'removeEmbed':
      removeEmbed(request.embedId);
      break;
  }
});
