/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DeepResearchOutputResult } from 'common/types/notebooks';

import { getMLService } from '../../server/services/get_set';
import { ParagraphRegistryItem } from '../services/paragraph_service';
import { extractCompletedResponse } from '../../common/utils/task';

export const PERAgentParagraph: ParagraphRegistryItem<DeepResearchOutputResult> = {
  getContext: async ({ paragraph, transport }) => {
    const taskId = paragraph.output?.[0].result.taskId;
    if (!taskId) {
      return '';
    }
    const task = await getMLService().getTask({
      transport,
      taskId,
    });
    const response = extractCompletedResponse(task);
    if (!response) {
      return '';
    }
    return `
      Step: Generate a research report for objective: \`\`\`${paragraph.input.inputText}\`\`\`
      Step result:
      ${response}
    `;
  },
};
