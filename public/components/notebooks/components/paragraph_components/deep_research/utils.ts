/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getMLCommonsMemoryMessages,
  getMLCommonsMessageTraces,
} from '../../../../../utils/ml_commons_apis';

export interface Trace {
  input: string;
  response?: string;
}

export const getAllTracesByMessageId = async (
  options: Omit<Parameters<typeof getMLCommonsMessageTraces>[0], 'nextToken'>
) => {
  const traces: Trace[] = [];
  let nextToken;
  do {
    try {
      const result = await getMLCommonsMessageTraces({
        ...options,
        nextToken,
      });
      result.traces.forEach((trace: Trace) => {
        traces.push(trace);
      });
      nextToken = result.next_token;
    } catch (e) {
      console.error(e);
      break;
    }
  } while (!!nextToken);
  return traces;
};

export const getAllMessagesByMemoryId = async (
  options: Omit<Parameters<typeof getMLCommonsMemoryMessages>[0], 'nextToken'>
) => {
  const messages = [];
  let nextToken;
  do {
    try {
      const result = await getMLCommonsMemoryMessages({
        ...options,
        nextToken,
      });
      result.messages.forEach((trace: Trace) => {
        messages.push(trace);
      });
      nextToken = result.next_token;
    } catch (e) {
      console.error(e);
      break;
    }
  } while (!!nextToken);
  return messages;
};

export const isMarkdownText = (text: string) => {
  // Common Markdown patterns to check for
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m, // Headers
    /(?<!\*)\*(?!\*)[^\*]+\*(?!\*)/, // Italic with single asterisk
    /(?<!_)_(?!_)[^_]+_(?!_)/, // Italic with underscore
    /\*\*[^\*]+\*\*/, // Bold with double asterisk
    /__[^_]+__/, // Bold with double underscore
    /^\s*[\*\-\+]\s+.+$/m, // Unordered lists
    /^\s*\d+\.\s+.+$/m, // Ordered lists
    /^\s*>\s+.+$/m, // Blockquotes
    /`[^`]+`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /\[.+?\]\(.+?\)/, // Links
    /!\[.+?\]\(.+?\)/, // Images
    /^\s*-{3,}\s*$/m, // Horizontal rules
    /^\|.+\|$/m, // Tables
  ];
  let matchedTimes = 0;

  // Check for any Markdown pattern
  for (const pattern of markdownPatterns) {
    if (pattern.test(text)) {
      matchedTimes++;
    }
  }

  return matchedTimes >= Math.min(markdownPatterns.length, 3);
};
