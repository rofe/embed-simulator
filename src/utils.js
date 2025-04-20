export default function matchUrl(currentUrl, tabUrl) {
  if (tabUrl.endsWith('*')) {
    // wildcard match
    return currentUrl.startsWith(tabUrl.slice(0, -1));
  }
  // exact match without hash
  return currentUrl.split('#')[0] === tabUrl.split('#')[0];
}
