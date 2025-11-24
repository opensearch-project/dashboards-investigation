/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPENSEARCH_ML_COMMONS_API } from '../../common/constants/ml_commons';
import { CoreStart } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';

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
  parameters: Record<string, any>;
  async?: boolean;
}) => {
  return http.post({
    path: `${NOTEBOOKS_API_PREFIX}/agents/${agentId}/_execute`,
    query: {
      async,
    },
    body: JSON.stringify({
      parameters,
      dataSourceId,
    }),
    signal,
  });
};

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
          created_time: {
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
