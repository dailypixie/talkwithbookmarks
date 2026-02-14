// Content script: provides page content to the extension and injects the bubble UI
chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function () {
    port.postMessage({ contents: document.body?.innerText ?? '' });
  });
});
