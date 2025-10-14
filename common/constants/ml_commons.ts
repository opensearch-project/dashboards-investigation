/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const OPENSEARCH_ML_COMMONS_API_PREFIX = '/_plugins/_ml';

export const OPENSEARCH_ML_COMMONS_API = {
  singleTask: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/tasks/{taskId}`,
  agentsSearch: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/agents/_search`,
  agentExecute: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/agents/{agentId}/_execute`,
  memorySearch: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/memory/_search`,
  singleMemory: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/memory/{memoryId}`,
  memoryMessages: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/memory/{memoryId}/messages`,
  messageTraces: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/memory/message/{messageId}/traces`,
  singleConfig: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/config/{configName}`,
};
