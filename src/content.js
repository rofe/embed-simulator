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
  highlightOverlay.firstElementChild.textContent = tag;
  highlightOverlay.firstElementChild.style.backgroundColor = isSelected ? '#2d9d78' : '#2680eb';
}

// Remove overlay
function removeOverlay() {
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
}

// Listen for messages from popup or service worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.action) {
    case 'startPickerMode':
      startPickerMode();
      break;
    case 'stopPickerMode':
      stopPickerMode();
      break;
    case 'applyEmbeds':
      console.log('Applying embeds:', request.embeds);
      applyEmbeds(request.embeds);
      break;
    case 'removeEmbed':
      console.log('Removing embed with ID:', request.embedId);
      const iframe = document.getElementById(`aem-embed-${request.embedId}`);
      if (iframe) {
        iframe.remove();
      } else {
        console.log('No iframe found with ID:', `aem-embed-${request.embedId}`);
      }
      break;
  }
});

function startPickerMode() {
  console.log('Enter picker mode');
  isPickerMode = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
}

function stopPickerMode() {
  console.log('Exit picker mode');
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

function handleClick(e) {
  console.log('handleClick', highlightedElement);
  if (!isPickerMode) return;

  e.preventDefault();
  e.stopPropagation();

  if (highlightedElement) {
    console.log('Element clicked:', highlightedElement);
    selectedElement = highlightedElement;
    updateOverlay(selectedElement, true);

    // Generate selector for the element
    const selector = generateSelector(selectedElement);
    console.log('Generated selector:', selector);

    // Send message to popup
    console.log('Sending elementSelected message to service worker');
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      selector: selector,
    });

    // Don't reset picker mode here - let the popup handle it
    isPickerMode = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick);
  }
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

  if (str === 'html') return str;


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

function applyEmbeds(embeds) {
  const currentUrl = window.location.href;

  embeds.forEach(embed => {
    console.log('Processing embed:', embed);
    if (embed.tabUrl === currentUrl && !document.getElementById(`embed-${embed.id}`)) {
      console.log('URL match found, looking for element with selector:', embed.selector);
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
        console.log('Insert iframe before', element, 'with URL', embed.url);
        element.parentNode.insertBefore(iframe, element);
      } else {
        console.log('No element found for selector:', embed.selector);
      }
    }
  });
}