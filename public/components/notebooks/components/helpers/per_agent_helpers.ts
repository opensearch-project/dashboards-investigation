/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEEP_RESEARCH_SYSTEM_PROMPT_KEY = 'deep-research-system-prompt';
export const DEEP_RESEARCH_EXECUTOR_SYSTEM_PROMPT_KEY = 'deep-research-executor-system-prompt';

export const generateAgentIdKey = (dataSourceId?: string) =>
  '{dataSourceId}-per-agent-id'.replace(
    '{dataSourceId}',
    typeof dataSourceId === 'undefined' ? 'undefined' : dataSourceId
  );

export const getLocalStoredAgentId = (dataSourceId: string | undefined) => {
  return localStorage.getItem(generateAgentIdKey(dataSourceId)) ?? undefined;
};

export const getSystemPrompts = () => {
  const prompts = {
    systemPrompt: localStorage.getItem(DEEP_RESEARCH_SYSTEM_PROMPT_KEY) ?? undefined,
    executorSystemPrompt:
      localStorage.getItem(DEEP_RESEARCH_EXECUTOR_SYSTEM_PROMPT_KEY) ?? undefined,
  };
  if (!prompts.systemPrompt && !prompts.executorSystemPrompt) {
    return undefined;
  }
  return prompts;
};

export const getLocalInputParameters = (dataSourceId: string | undefined) => {
  return {
    prompts: getSystemPrompts(),
    agentId: getLocalStoredAgentId(dataSourceId),
  };
};
