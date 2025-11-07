/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarkdownParagraph } from '../components/notebooks/components/paragraph_components/markdown';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const MarkdownParagraphItem: ParagraphRegistryItem = {
  ParagraphComponent: MarkdownParagraph,
  getContext: async (paragraph) => {
    const { output } = paragraph || {};
    if (!output?.[0].result) {
      return '';
    }

    return `
## Step description
User types somes note by using this step.

## Step result:
${output[0].result}
    `;
  },
  runParagraph: async () => {
    return;
  },
};
