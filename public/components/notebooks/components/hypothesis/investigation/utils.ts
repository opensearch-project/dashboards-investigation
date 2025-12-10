/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  executeMLCommonsAgenticMessage,
  getMLCommonsAgenticMemoryMessages,
  getMLCommonsAgenticTracesMessages,
} from '../../../../../utils/ml_commons_apis';

export interface Trace {
  input: string;
  response?: string;
  message_id?: string;
  origin?: string;
  create_time?: string;
}

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

export const getAllMessagesBySessionIdAndMemoryId = async (
  options: Parameters<typeof getMLCommonsAgenticMemoryMessages>[0]
) => {
  const messages: Trace[] = [];
  let nextToken = options.nextToken;
  do {
    try {
      const result = await getMLCommonsAgenticMemoryMessages({
        ...options,
        nextToken,
      });
      result.hits.hits.forEach((hit: any) => {
        const structuredData = hit._source.structured_data;
        messages.push({
          input: structuredData.input,
          response: structuredData.response,
          message_id: hit._id,
        });
      });
      nextToken = result.next_token;
    } catch (e) {
      console.error(e);
      break;
    }
  } while (!!nextToken);
  return messages;
};

export const getAllTracesMessages = async (
  options: Parameters<typeof getMLCommonsAgenticTracesMessages>[0]
) => {
  const traces: Trace[] = [];
  let nextToken = options.nextToken;
  do {
    try {
      const result = await getMLCommonsAgenticTracesMessages({
        ...options,
        nextToken,
      });

      const hits = result.hits?.hits || [];
      hits.forEach((hit: any) => {
        const structuredData = hit._source.structured_data;
        traces.push(structuredData);
      });

      if (hits.length > 0) {
        const lastHit = hits[hits.length - 1];
        nextToken = lastHit.sort?.[0];
      } else {
        nextToken = undefined;
      }
    } catch (e) {
      console.error(e);
      break;
    }
  } while (!!nextToken);

  return traces;
};

export const getFinalMessage = async (
  options: Parameters<typeof executeMLCommonsAgenticMessage>[0]
) => {
  let finalMessage;
  try {
    const response = await executeMLCommonsAgenticMessage(options);
    finalMessage = response?.hits?.hits?.[0]?._source?.structured_data?.response;
  } catch (error) {
    console.error('Failed to execute ml commons agentic message api');
    finalMessage = null;
  }
  return finalMessage;
};
