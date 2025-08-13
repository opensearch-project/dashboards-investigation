/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const isStateCompletedOrFailed = (state: string) => ['COMPLETED', 'FAILED'].includes(state);

export const extractExecutorMemoryId = (task) => {
  const inferenceResult = task?.response?.inference_results?.[0];
  return (
    task?.response?.executor_agent_memory_id ??
    inferenceResult?.output.find(({ name }) => name === 'executor_agent_memory_id')?.result
  );
};

export const extractParentInteractionId = (task) => {
  return task?.response.parent_interaction_id;
};

export const extractMemoryId = (task) => {
  return task?.response.memory_id;
};

export const extractCompletedResponse = (task) => {
  const inferenceResult = task?.response?.inference_results?.[0];
  return inferenceResult?.output.find(({ name }) => name === 'response').dataAsMap.response;
};

export const extractFailedErrorMessage = (task) => {
  return task.response.error_message;
};
