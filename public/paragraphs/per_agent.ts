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
import { ParagraphState } from '../../common/state/paragraph_state';
import { getMLCommonsMessage } from '../../public/utils/ml_commons_apis';

export const PERAgentParagraphItem: ParagraphRegistryItem<
  DeepResearchOutputResult,
  DeepResearchInputParameters
> = {
  ParagraphComponent: DeepResearchParagraph,
  getContext: async (paragraph) => {
    const { dataSourceMDSId, input } = paragraph || {};
    const outputResult = ParagraphState.getOutput(paragraph);
    const taskId = outputResult?.result?.taskId;
    const messageId = outputResult?.result.messageId;

    if (!taskId && !messageId) {
      return '';
    }

    let response = '';
    if (messageId) {
      const message = await getMLCommonsMessage({
        http: getClient(),
        dataSourceId: dataSourceMDSId,
        messageId,
      });
      response = message.response;
    }

    if (!response && taskId) {
      const task = await callOpenSearchCluster({
        http: getClient(),
        dataSourceId: dataSourceMDSId,
        request: {
          path: `/_plugins/_ml/tasks/${taskId}`,
          method: 'GET',
        },
      });
      response = extractCompletedResponse(task);
    }

    if (!response) {
      return '';
    }
    return `
        Step: Generate a research report for objective: \`\`\`${input.inputText}\`\`\`
        Step result:
        ${response}
      `;
  },
  runParagraph: async () => {
    return;
  },
};
