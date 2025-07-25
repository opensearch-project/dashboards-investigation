/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPENSEARCH_ML_COMMONS_API } from '../../common/constants/ml_commons';
import { CoreStart, HttpFetchQuery } from '../../../../src/core/public';

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
  query?: HttpFetchQuery;
  signal?: AbortSignal;
  dataSourceId?: string;
  body?: BodyInit;
}) =>
  http.post({
    path: '/api/console/proxy',
    query: {
      ...query,
      path,
      method,
      dataSourceId,
    },
    signal,
    body,
  });

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
  nextToken?: string;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.memoryMessages.replace('{memoryId}', memoryId),
    signal,
    dataSourceId,
    query: {
      ...(nextToken ? { next_token: nextToken } : {}),
    },
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
  nextToken?: number;
}) =>
  callApiWithProxy({
    http,
    method: 'GET',
    path: OPENSEARCH_ML_COMMONS_API.messageTraces.replace('{messageId}', messageId),
    signal,
    dataSourceId,
    query: {
      next_token: nextToken,
    },
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

const actionsMetadata = [
  {
    id: 'PPL',
    title: 'PPL',
    description:
      'display PPL block: Piped Processing Language (PPL) is a query language that focuses on processing data in a sequential, step-by-step manner.',
    input_metadata: {
      ppl: {
        type: 'string',
        description: 'ppl query',
        required: true,
      },
    },
  },
  {
    id: 'DEEP_RESEARCH_AGENT',
    title: 'PlanAndExecuteAgent',
    description:
      'display PlanAndExecuteAgent block: PlanAndExecuteAgent is capable of breaking down complex tasks into simple steps and re-evaluating the steps based on intermediate results.',
    input_metadata: {
      question: {
        type: 'string',
        description: 'user question',
        required: true,
      },
    },
  },
  {
    id: 'VISUALIZATION',
    title: 'Visualization',
    description:
      'display visualization block: user can select existing visualization and display it in the block.',
  },
  {
    id: 'MARKDOWN',
    title: 'Markdown',
    description:
      'display markdown block: If the input follows markdown syntax, use the markdown editor to create formatted text.',
    input_metadata: {
      markdown_text: {
        type: 'string',
        description: 'markdown text',
        required: true,
      },
    },
  },
];

// export const selectAction = async ({
//   http,
//   inputQuestion,
// }: {
//   http: CoreStart['http'];
//   inputQuestion: string;
// }) => 
//   callApiWithProxy({
//     http,
//     method: 'POST',
//     path: OPENSEARCH_ML_COMMONS_API.agentExecute.replace('{agentId}', agentId),
//     body: JSON.stringify({
//       parameters: {
//         actions_metadata: actionsMetadata.map((acion) => JSON.stringify(acion)).join(','),
//         input_question: inputQuestion,
//       },
//     }),
//   });
