/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const constructDeepResearchParagraphOut = ({
  task,
  agentId,
  memoryId,
  taskId,
  parentInteractionId,
  state,
}: {
  task?: any;
  agentId?: string;
  memoryId?: string;
  taskId: string;
  parentInteractionId?: string;
  state?: string;
}) => {
  const inferenceResult = task?.response?.inference_results?.[0];
  const executorMemoryId =
    task?.response?.executor_agent_memory_id ??
    inferenceResult?.output.find(({ name }) => name === 'executor_agent_memory_id')?.result ??
    undefined;
  let textResponse;
  if (task?.state === 'FAILED') {
    textResponse = task.response.error_message;
  } else if (task?.state === 'COMPLETED') {
    textResponse =
      inferenceResult?.output.find(({ name }) => name === 'response').dataAsMap.response ??
      undefined;
  }

  return {
    agent_id: agentId,
    memory_id: memoryId || task?.response.memory_id,
    task_id: taskId,
    state: state ?? task?.state,
    executor_memory_id: executorMemoryId,
    text_response: textResponse,
    parent_interaction_id: parentInteractionId || task?.response.parent_interaction_id,
    ...(executorMemoryId !== undefined ? { executor_memory_id: executorMemoryId } : {}),
    ...(textResponse !== undefined ? { text_response: textResponse } : {}),
  };
};
