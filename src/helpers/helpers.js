const graphqlEndpoint = '/api/graphql';

const getPipelines = async (url, token, endpoint, refresh) => {
  const query = `
    query {
      group(fullPath: "${endpoint}") {
        id
        name
        avatarUrl
        webUrl
        projects(includeSubgroups: true) {
          edges {
            node {
              id
              fullPath
              webUrl
              pipelines(first: 1) {
                edges {
                  node {
                    id
                    status
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const body = JSON.stringify({ query });

  const response = await fetch(
    `${url}/${graphqlEndpoint}`,
    {
      method: 'post',
      body,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  const json = await response.json();
  if (json && !json.errors) {
    const { data: { group } } = json;
    if (group) {
      const { projects } = group;
      let failedCounter = 0;
      let successCounter = 0;
      const children = projects.edges.filter((p) => (p.node.pipelines.edges.length > 0)).map((p) => {
        const { node } = p;
        const name = node.fullPath;
        const pipelines = node.pipelines.edges;
        const lastPipeline = pipelines[0].node;
        const pipId = lastPipeline.id.split('/');
        const pipelineUrl = `${url}/${name}/pipelines/${pipId[pipId.length - 1]}`
        lastPipeline.webUrl = pipelineUrl
        if (lastPipeline.status === 'SUCCESS') {
          successCounter += 1;
        } else if (lastPipeline.status === 'FAILED') {
          failedCounter += 1;
        }

        const avatarUrl = node.avatarUrl;
        const webUrl = node.webUrl;
        return {
          name,
          avatarUrl,
          pipeline: lastPipeline,
          webUrl,
        }
      }).sort((a, b) => {
        if (a.pipeline.status > b.pipeline.status) {
          return 1;
        }
        if (a.pipeline.status < b.pipeline.status) {
          return -1;
        }
        if (a.pipeline.status === 'SUCCESS') {
          return 1;
        }
        if (a.pipeline.status === 'FAILED') {
          return -1;
        }

        return 0;
      });
      return {
        successCounter,
        failedCounter,
        groupName: group.name,
        projects: children,
        avatarUrl: group.avatarUrl,
        webUrl: group.webUrl,
      };
    }
    return {
      error: "Group unknown",
    }
  }
  return {
    error: "Error while getting data"
  };
};

const setGetPipelineError = (msg) => {
  chrome.browserAction.setBadgeText({ text: 'Error' });
  chrome.browserAction.setTitle({ title: `Error while getting pipeline, please check configuration\n${JSON.stringify(msg)}` });
  chrome.browserAction.setBadgeBackgroundColor({ color: '#F00' });
}

const setExtensionsInfo = (data) => {
  if (!data.error) {
    const tooltip = `Pipelines for ${data.groupName}\n - Success: ${data.successCounter}\n - Failed: ${data.failedCounter}`;
    chrome.browserAction.setTitle({ title: tooltip });
    if (data.failedCounter > 0) {
      chrome.browserAction.setBadgeText({ text: `${data.failedCounter}` });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#F00' });
    } else {
      chrome.browserAction.setBadgeText({ text: '' });
    }
  } else {
    chrome.browserAction.setBadgeText({ text: `Error` });
    chrome.browserAction.setTitle({ title: 'Error while getting pipeline, Please fix Gitlab URL in options or check your network settings' });
    chrome.browserAction.setBadgeBackgroundColor({ color: '#F00' });
  }
  return Promise.resolve(data);
}
