let interval = 0;
let timeoutId;

const mainLoop = () => {
  chrome.storage.sync.get(['url', 'token', 'endpoint', 'refresh'], function (result) {
    const { url, token, endpoint, refresh } = result;
    interval = refresh * 1000 * 60;
    getPipelines(url, token, endpoint, refresh)
      .then(setExtensionsInfo)
      .catch(setGetPipelineError);
    timeoutId = setTimeout(mainLoop, interval);
  });
};

chrome.runtime.onInstalled.addListener(function () {
  mainLoop();
});
