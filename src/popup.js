const buildItem = (d) => {
  const name = d.name;
  const webUrl = d.webUrl;
  const avatarUrl = d.avatarUrl;
  const status = d.pipeline.status;

  const item = document.createElement('div');
  item.className = 'item';

  const a = document.createElement('a');
  a.href = d.pipeline.webUrl;
  a.textContent = name;
  item.appendChild(a);

  const pipelineSpan = document.createElement('span');
  pipelineSpan.className = `pipeline ${status}`;
  pipelineSpan.textContent = status;
  item.appendChild(pipelineSpan);
  return item;
}

const init = () => {
  document.querySelector('#optionButton').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('src/options.html'));
    }
  });

  chrome.storage.sync.get(['url', 'token', 'endpoint', 'refresh'], function (result) {
    const { url, token, endpoint, refresh } = result;
    const loadingDiv = document.querySelector('#loading');
    const errorDiv = document.querySelector('#error');
    const titleDiv = document.querySelector('#title');
    const contentDiv = document.querySelector('#content');

    errorDiv.style.display = "none";
    loadingDiv.style.display = "block";
    contentDiv.style.display = "none";

    getPipelines(url, token, endpoint, refresh)
      .then(setExtensionsInfo)
      .then((data) => {
        if (!data.error) {
          loadingDiv.style.display = "none";
          contentDiv.style.display = "block";
          titleDiv.textContent = `${data.groupName}`;
          data.projects.map((d) => {
            const div = buildItem(d);
            contentDiv.appendChild(div);
          });
        } else {
          loadingDiv.style.display = "none";
          contentDiv.style.display = "none";
          errorDiv.style.display = "block";
          errorDiv.textContent = data.error;
        }
      })
      .catch((error) => {
        loadingDiv.style.display = "none";
        contentDiv.style.display = "none";
        errorDiv.style.display = "block";
        errorDiv.innerHTML = `Error while getting pipeline, Please fix Gitlab URL in options or check your network settings<br/>${JSON.stringify(error)}`;
        setGetPipelineError(err);
      });
  });
}

document.addEventListener('DOMContentLoaded', init);


