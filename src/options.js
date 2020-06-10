const init = () => {
  const urlInput = document.querySelector("#url");
  const tokenInput = document.querySelector("#token");
  const endpointInput = document.querySelector("#endpoint");
  const refreshIntervalInput = document.querySelector("#interval");
  const btn = document.querySelector('input[type="button"]');

  // DISABLE/Enable Confirm button when typing in fields
  urlInput.addEventListener('input', () => {
    btn.disabled = valuesEmpty();
  });
  tokenInput.addEventListener('input', () => {
    btn.disabled = valuesEmpty();
  });
  endpointInput.addEventListener('input', () => {
    btn.disabled = valuesEmpty();
  });
  refreshIntervalInput.addEventListener('input', () => {
    btn.disabled = valuesEmpty();
  });


  // Helper to get Input values
  const getValues = () => {
    const url = urlInput.value
    const token = tokenInput.value;
    const endpoint = endpointInput.value;
    const refresh = refreshIntervalInput.value;
    return { url, token, endpoint, refresh };
  }

  // Helper to check if at least one field is empty
  const valuesEmpty = () => {
    return Object.values(getValues()).some((v) => (v === undefined || v === null || v === "" || v === "0"));
  }

  // On click on confirm button, save data in storage, and perform a gitlab test
  btn.onclick = () => {
    const { url, token, endpoint, refresh } = getValues();
    if (!valuesEmpty()) {
      chrome.storage.sync.set({ url, token, endpoint, refresh }, function () {
        getPipelines(url, token, endpoint, refresh)
          .then(setExtensionsInfo)
          .catch(setGetPipelineError);
      });
    }
  }

  chrome.storage.sync.get(['url', 'token', 'endpoint', 'refresh'], function (result) {
    const { url, token, endpoint, refresh } = result;
    if (url) urlInput.value = url;
    if (token) tokenInput.value = token;
    if (endpoint) endpointInput.value = endpoint;
    if (refresh) refreshIntervalInput.value = refresh;
    // DISABLE Confirm button if at least one of the field is empty
    btn.disabled = valuesEmpty();
  });
};


document.addEventListener('DOMContentLoaded', init);