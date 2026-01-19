/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatPluginSetup } from '../../../../../src/plugins/chat/public';

export const registerInvestigateCommand = (
  chatSetup?: ChatPluginSetup
): (() => void) | undefined => {
  // Register /investigate command
  return chatSetup?.commandRegistry?.registerCommand({
    command: 'investigate',
    description: 'Ask investigation agent to find root cause',
    usage: '/investigate <description of what to investigate>',
    hint: 'based on conversation, or enter a different goal.',
    handler: async (args: string): Promise<string> => {
      // If args provided, user has specified the goal
      if (args.trim()) {
        return `I want to create a NEW investigation for: ${args}

This should be a completely new investigation, separate from any previous investigations in our conversation. Use the available page context and our conversation history to gather any additional information needed, then create the new investigation.`;
      }
      // No args - LLM needs to infer everything from conversation and context
      return `I want to create a NEW investigation based on our conversation and the current page context.

This should be a completely new investigation, separate from any previous investigations in our conversation. Review our discussion to understand what needs to be investigated, gather the necessary information, then create the new investigation.`;
    },
  });
};
