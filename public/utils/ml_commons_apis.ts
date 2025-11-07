/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPENSEARCH_ML_COMMONS_API } from '../../common/constants/ml_commons';
import { CoreStart } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';

const callApiWithProxy = ({
  path,
  http,
  method,
  query,
  signal,
  dataSourceId,
  body,
}: {
  path: string;
  http: CoreStart['http'];
  method: string;
  query?: Record<string, string | number>;
  signal?: AbortSignal;
  dataSourceId?: string;
  body?: BodyInit;
}) => {
  const validQueryEntries = query
    ? Object.entries(query).filter(([_key, value]) => typeof value !== 'undefined')
    : [];
  if (validQueryEntries.length > 0) {
    path = `${path}?${validQueryEntries.map((item) => item.join('=')).join('&')}`;
  }
  return callOpenSearchCluster({
    http,
    request: {
      path,
      method,
      body,
    },
    dataSourceId,
    signal,
  });
};

export const getMLCommonsTask = async ({
  http,
  taskId,
  signal,
  dataSourceId,
}: {
  http: CoreStart['http'];
  taskId: string;
  signal?: AbortSignal;
  dataSourceId?: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.singleTask.replace('{taskId}', taskId),
    signal,
    dataSourceId,
  });

export const getMLCommonsSingleMemory = async ({
  http,
  signal,
  dataSourceId,
  memoryId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  memoryId: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.singleMemory.replace('{memoryId}', memoryId),
    signal,
    dataSourceId,
  });

export const getMLCommonsMemoryMessages = async ({
  http,
  memoryId,
  signal,
  dataSourceId,
  nextToken,
}: {
  http: CoreStart['http'];
  memoryId: string;
  signal?: AbortSignal;
  dataSourceId?: string;
  nextToken?: string | number;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.memoryMessages.replace('{memoryId}', memoryId),
    signal,
    dataSourceId,
    query:
      typeof nextToken !== 'undefined'
        ? {
            next_token: nextToken,
          }
        : {},
  });

export const getMLCommonsMessageTraces = async ({
  http,
  messageId,
  signal,
  dataSourceId,
  nextToken,
}: {
  http: CoreStart['http'];
  messageId: string;
  signal?: AbortSignal;
  dataSourceId?: string;
  nextToken?: string | number;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.messageTraces.replace('{messageId}', messageId),
    signal,
    dataSourceId,
    query:
      typeof nextToken !== 'undefined'
        ? {
            next_token: nextToken,
          }
        : {},
  });

export const getMLCommonsMessage = async ({
  http,
  messageId,
  signal,
  dataSourceId,
}: {
  http: CoreStart['http'];
  messageId: string;
  signal?: AbortSignal;
  dataSourceId?: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.singleMessage.replace('{messageId}', messageId),
    signal,
    dataSourceId,
  });

export const searchMLCommonsAgents = ({
  http,
  signal,
  dataSourceId,
  types,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  types: string[];
}) =>
  callApiWithProxy({
    http,
    method: 'POST',
    path: OPENSEARCH_ML_COMMONS_API.agentsSearch,
    signal,
    dataSourceId,
    body: JSON.stringify({
      query: {
        terms: {
          type: types,
        },
      },
      size: 10000,
    }),
  });

export const executeMLCommonsAgent = ({
  http,
  signal,
  dataSourceId,
  agentId,
  async,
  parameters,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  agentId: string;
  parameters: Record<string, string>;
  async?: boolean;
}) =>
  callApiWithProxy({
    http,
    method: 'POST',
    path: OPENSEARCH_ML_COMMONS_API.agentExecute.replace('{agentId}', agentId),
    signal,
    dataSourceId,
    query: {
      async: async ? 'true' : undefined,
    },
    body: JSON.stringify({
      parameters,
    }),
  });

export const getMLCommonsConfig = ({
  http,
  signal,
  configName,
  dataSourceId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  configName: string;
  dataSourceId?: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', configName),
    signal,
    dataSourceId,
  });

export const getMLCommonsAgentDetail = ({
  http,
  signal,
  agentId,
  dataSourceId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  agentId: string;
  dataSourceId?: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.agentDetail.replace('{agentId}', agentId),
    signal,
    dataSourceId,
  });

// Get single message response after agent execution. by Parent Interaction ID
export const executeMLCommonsAgenticMessage = ({
  http,
  signal,
  dataSourceId,
  memoryContainerId,
  messageId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  memoryContainerId: string;
  messageId: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.agenticMemorySearch.replace(
      '{memory_container_id}',
      memoryContainerId
    ),
    signal,
    dataSourceId,
    body: JSON.stringify({
      query: {
        term: {
          _id: messageId,
        },
      },
      sort: [
        {
          created_time: {
            order: 'desc',
          },
        },
      ],
    }),
  });

// Get Executor Messages (planner messages) by Executor Memory ID
export const getMLCommonsAgenticMemoryMessages = ({
  http,
  signal,
  dataSourceId,
  memoryContainerId,
  sessionId,
  nextToken,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  memoryContainerId: string;
  sessionId: string;
  nextToken?: string | number;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.agenticMemorySearch.replace(
      '{memory_container_id}',
      memoryContainerId
    ),
    signal,
    dataSourceId,
    body: JSON.stringify({
      query: {
        bool: {
          must: [
            {
              term: {
                'namespace.session_id': sessionId,
              },
            },
          ],
          must_not: [
            {
              term: {
                'metadata.type': 'trace',
              },
            },
          ],
        },
      },
      sort: [
        {
          message_id: {
            order: 'asc',
          },
        },
      ],
      size: 50,
      ...(typeof nextToken !== 'undefined' && { from: nextToken }),
    }),
  });

// Create an empty executor memory for agent execution
export const createAgenticExecutionMemory = ({
  http,
  signal,
  dataSourceId,
  memoryContainerId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  memoryContainerId: string;
}) =>
  callApiWithProxy({
    http,
    method: 'POST',
    path: OPENSEARCH_ML_COMMONS_API.agenticMemory.replace(
      '{memory_container_id}',
      memoryContainerId
    ),
    signal,
    dataSourceId,
    body: JSON.stringify({
      summary: 'investigation',
    }),
  });

// Retrieves sub-steps and detailed execution information for a specific execution step
export const getMLCommonsAgenticTracesMessages = ({
  http,
  signal,
  dataSourceId,
  memoryContainerId,
  messageId,
  executorMemoryId,
  nextToken,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  memoryContainerId: string;
  messageId: string;
  executorMemoryId: string;
  nextToken?: string | number;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.agenticMemorySearch.replace(
      '{memory_container_id}',
      memoryContainerId
    ),
    signal,
    dataSourceId,
    body: JSON.stringify({
      query: {
        bool: {
          must: [
            {
              match: {
                'metadata.parent_message_id': messageId,
              },
            },
            {
              match: {
                'namespace.session_id': executorMemoryId,
              },
            },
            {
              match: {
                'metadata.type': 'trace',
              },
            },
          ],
        },
      },
      sort: [
        {
          message_id: {
            order: 'asc',
          },
        },
      ],
      size: 50,
      ...(typeof nextToken !== 'undefined' && { search_after: [nextToken] }),
    }),
  });

export const executeMLCommonsMessageByTask = ({
  http,
  signal,
  dataSourceId,
  taskId,
}: {
  http: CoreStart['http'];
  signal?: AbortSignal;
  dataSourceId?: string;
  taskId: string;
}) =>
  callApiWithProxy({
    http,
    method: 'get',
    path: `/_plugins/_ml/tasks/${taskId}`,
    signal,
    dataSourceId,
  });
