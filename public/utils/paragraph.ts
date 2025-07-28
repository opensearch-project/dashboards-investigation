/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const parseParagraphOut = (paragraph) => {
  if (Array.isArray(paragraph.out)) {
    const result = [];
    for (let i = 0; i < paragraph.out.length; i++) {
      try {
        if (!paragraph.out[i]) {
          continue;
        }
        // Attempt to parse each output as JSON
        result.push(JSON.parse(paragraph.out[i]));
      } catch (e) {
        result.push(paragraph.out[i]);
      }
    }
    return result;
  }
  return [];
};
