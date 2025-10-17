/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPENSEARCH_ML_COMMONS_API } from '../../common/constants/ml_commons';
import { CoreStart } from '../../../../src/core/public';

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
  return http.post({
    path: '/api/console/proxy',
    query: {
      path,
      method,
      dataSourceId,
    },
    signal,
    body,
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
