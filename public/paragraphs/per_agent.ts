/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';
import {
  DeepResearchInputParameters,
  DeepResearchOutputResult,
} from '../../common/types/notebooks';
import { DeepResearchParagraph } from '../components/notebooks/components/paragraph_components/deep_research';
import { ParagraphRegistryItem } from '../services/paragraph_service';
import { getClient } from '../services';
import { extractCompletedResponse } from '../../common/utils/task';

export const PERAgentParagraphItem: ParagraphRegistryItem<
  DeepResearchOutputResult,
  DeepResearchInputParameters
> = {
  ParagraphComponent: DeepResearchParagraph,
  getContext: async (paragraph) => {
    const { dataSourceMDSId, input, output } = paragraph || {};
    const taskId = output?.[0].result.taskId;

    if (!taskId) {
      return '';
    }

    const task = await callOpenSearchCluster({
      http: getClient(),
      dataSourceId: dataSourceMDSId,
      request: {
        path: `/_plugins/_ml/tasks/${taskId}`,
        method: 'GET',
      },
    });

    const response = extractCompletedResponse(task);
    if (!response) {
      return '';
    }
    return `
        Step: Generate a research report for objective: \`\`\`${input.inputText}\`\`\`
        Step result:
        ${response}
      `;
  },
};
