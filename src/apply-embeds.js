// Temporary storage for embed handling
window.aemEmbeds = window.aemEmbeds || {};
window.aemEmbeds.appliedEmbeds = [];

// Helper function to create an embed
function createEmbed(element, {
  id, embedUrl, embedWidth, embedHeight,
}) {
  const existingEmbed = document.getElementById(`aem-embed-${id}`);

  const iframeUrl = new URL('https://main--aem-embed--adobe.aem.page/tools/iframe/iframe.html');
  iframeUrl.searchParams.set('url', embedUrl);

  const embedHTML = `
    <style>
      #aem-embed-${id} {
        width: ${embedWidth || '100%'};
        max-width: 1200px;
        min-height: ${embedHeight || '280px'};
        border: none;
      }
      @media (min-width: 900px) {
        #aem-embed-${id} {
          min-height: ${embedHeight || '166px'};
        }
      }
    </style>
    <iframe 
      id="aem-embed-${id}"
      src="${iframeUrl}"
    ></iframe>
  `;

  if (existingEmbed) {
    // console.log(`Replacing existing embed ${id}`);
    existingEmbed.insertAdjacentHTML('beforebegin', embedHTML);
    existingEmbed.remove();
  } else {
    // console.log('Inserting embed before element');
    element.insertAdjacentHTML('beforebegin', embedHTML);
    // Remember applied embeds
    window.aemEmbeds.appliedEmbeds.push(id);
  }
}

async function applyEmbeds(embeds) {
  const matchUrl = (await import(chrome.runtime.getURL('utils.js'))).default;
  const currentUrl = window.location.href;
  window.aemEmbeds.delayedEmbeds = [];

  // Process embeds
  embeds
    .filter((embed) => !window.aemEmbeds.appliedEmbeds.includes(embed.id)) // Only apply new embeds
    .filter((embed) => matchUrl(currentUrl, embed.tabUrl))
    .forEach((embed) => {
      const element = document.querySelector(embed.selector);
      if (element) {
        createEmbed(element, embed);
      } else {
        window.aemEmbeds.delayedEmbeds.push(embed);
      }
    });

  // If we have delayed embeds, start observing DOM changes
  if (window.aemEmbeds.delayedEmbeds.length > 0) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          // Check if any delayed embeds can now be applied
          window.aemEmbeds.delayedEmbeds.forEach((embed, index) => {
            const element = document.querySelector(embed.selector);
            if (element) {
              createEmbed(element, embed);
              window.aemEmbeds.delayedEmbeds
                .splice(window.aemEmbeds.delayedEmbeds.length - 1 - index, 1);
            }
          });

          // If no more delayed embeds, disconnect the observer
          if (window.aemEmbeds.delayedEmbeds.length === 0) {
            observer.disconnect();
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

if (!window.aemEmbeds.appliedEmbedsInitialized) {
  // Listen for messages from popup or service worker
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'applyEmbeds') {
      applyEmbeds(request.embeds || []);
    }
  });
  window.aemEmbeds.appliedEmbedsInitialized = true;
}
