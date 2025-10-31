/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPENSEARCH_ML_COMMONS_API } from '../../common/constants/ml_commons';
import { OpenSearchClient } from '../../../../src/core/server';

export class MLService {
  constructor() {}

  getTask = ({ transport, taskId }: { transport: OpenSearchClient['transport']; taskId: string }) =>
    transport
      .request({
        path: OPENSEARCH_ML_COMMONS_API.singleTask.replace('{taskId}', taskId),
        method: 'GET',
      })
      .then(({ body }) => body);

  executeAgent = ({
    transport,
    agentId,
    async,
    parameters,
  }: {
    transport: OpenSearchClient['transport'];
    agentId: string;
    async?: boolean;
    parameters: {
      question: string;
      planner_prompt_template?: string;
      planner_with_history_template?: string;
      reflect_prompt_template?: string;
      context?: string;
      executor_system_prompt?: string;
      memory_id?: string;
    };
  }) =>
    transport.request({
      path: OPENSEARCH_ML_COMMONS_API.agentExecute.replace('{agentId}', agentId),
      method: 'POST',
      querystring: async ? 'async=true' : undefined,
      body: {
        parameters,
      },
    });

  getMLConfig = ({
    transport,
    configName,
  }: {
    transport: OpenSearchClient['transport'];
    configName: string;
  }) =>
    transport
      .request({
        path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', configName),
        method: 'GET',
      })
      .then(({ body }) => body);

  analyzeLogPattern = ({
    transport,
    parameters,
  }: {
    transport: OpenSearchClient['transport'];
    parameters: {
      baseTimeRangeStart?: string;
      baseTimeRangeEnd?: string;
      selectionTimeRangeStart: string;
      selectionTimeRangeEnd: string;
      traceFieldName?: string;
      timeField: string;
      logFieldName: string;
      index: string;
    };
  }) =>
    transport
      .request(
        {
          method: 'POST',
          path: `/_plugins/_ml/tools/_execute/LogPatternAnalysisTool`,
          body: { parameters },
        },
        {
          requestTimeout: 300000,
          maxRetries: 0,
        }
      )
      .then(({ body }) => body);

  createMemory = ({
    transport,
    name,
  }: {
    transport: OpenSearchClient['transport'];
    name: string;
  }) =>
    transport
      .request({
        path: OPENSEARCH_ML_COMMONS_API.memory,
        method: 'POST',
        body: { name },
      })
      .then(({ body }) => body);
}
