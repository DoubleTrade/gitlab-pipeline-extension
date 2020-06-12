const graphqlEndpoint = '/api/graphql';

const queryText = (endpointArray) => {
  const query = endpointArray.map((group, i) => {
    return `group${i}: group(fullPath: "${group}") {
      ...commonData
    }
    `
  });
  return `{
    ${query}
  }`;
};

const getPipelines = async (url, token, endpoint, refresh) => {
  const endpointArray = endpoint.split(',');
  const q = queryText(endpointArray);
  const query = `
    fragment commonData on Group {
      name
      projects(includeSubgroups: true) {
        edges {
          node {
            id
            fullPath
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
    ${q}
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
    const { data } = json;
    if (data && Object.entries(data).length) {

      let failedCounter = 0;
      let successCounter = 0;

      const unknownGroups = [];
      const groupsName = [];

      const groups = Object.values(data)
        .filter((group, i) => {
          if (!group) {
            unknownGroups.push(endpointArray[i]);
          }
          return group;
        })
        .map((group, i) => {
          if (group) {
            const { projects } = group;
            groupsName.push(group.name);
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
              return {
                name,
                pipeline: lastPipeline,
              }
            });
            return children;
          } else {
            return null;
          }
        });

      const sortedGroups = groups.flat().sort((a, b) => {
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
        groupName: groupsName,
        unknownGroups,
        projects: sortedGroups,
      };
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
    const { unknownGroups, groupName, successCounter, failedCounter } = data;
    const missingGroupStr = unknownGroups.length ? `\n\n/!\\ Group "${unknownGroups.join(' - ')}" missing from gitlab, please fix it in configuration` : null;
    const tooltip = `Pipelines for ${groupName}
    - Success: ${successCounter}
    - Failed: ${failedCounter}
    ${missingGroupStr}
    `;
    chrome.browserAction.setTitle({ title: tooltip });
    if (failedCounter > 0) {
      chrome.browserAction.setBadgeText({ text: `${failedCounter}` });
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
