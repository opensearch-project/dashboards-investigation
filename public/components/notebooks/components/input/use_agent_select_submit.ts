/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { isEmpty } from 'lodash';
import { CoreStart } from '../../../../../../../src/core/public';
import { ActionMetadata, actionsMetadata } from '../../../../../common/constants/actions';
import { executeMLCommonsAgent, getMLCommonsConfig } from '../../../../utils/ml_commons_apis';
import { AI_RESPONSE_TYPE } from '../../../../../common/constants/notebooks';
import { ParagraphInputType } from './types';

interface AgentSelectSubmitHookProps {
  http: CoreStart['http'];
  dataSourceId: string | undefined | null;
  onSubmit: (input: ParagraphInputType) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAgentSelectSubmit = ({
  http,
  dataSourceId,
  onSubmit,
  setIsLoading,
}: AgentSelectSubmitHookProps) => {
  const executeActionSelectionAgent = async (input: string, actions: ActionMetadata[]) => {
    try {
      const {
        configuration: { agent_id: actionSelectionAgentId },
      } = await getMLCommonsConfig({
        http,
        configName: 'action-selection-agent',
        dataSourceId: dataSourceId ?? undefined,
      });

      if (!actionSelectionAgentId) {
        throw new Error('Failed to get actionSelectionAgentId');
      }

      const result = await executeMLCommonsAgent({
        http,
        agentId: actionSelectionAgentId,
        dataSourceId: dataSourceId ?? undefined,
        parameters: {
          actionsMetaData: actions.map((action) => JSON.stringify(action)).join(','),
          input,
        },
      });

      return result;
    } catch (error) {
      console.error('Error occured during executing action selection agent:', error);
      throw error;
    }
  };
  const handleAgentSelectSubmit = async (inputValue: string, onSuccess: () => void) => {
    setIsLoading(true);

    if (!inputValue || isEmpty(inputValue.trim())) {
      return;
    }

    try {
      const response = await executeActionSelectionAgent(inputValue, actionsMetadata);
      const rawResult = JSON.parse(response?.inference_results?.[0]?.output?.[0]?.result);
      const jsonMatch = rawResult?.content?.[0]?.text?.match(/\{[\s\S]*\}/);
      let inputType = AI_RESPONSE_TYPE;
      let paragraphInput = '';
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        switch (result.action) {
          case 'PPL':
            inputType = 'PPL';
            paragraphInput = result.input?.inputQuery || '';
            break;
          case 'SQL':
            inputType = 'SQL';
            paragraphInput = result.input?.inputQuery || '';
            break;
          case 'MARKDOWN':
            inputType = 'MARKDOWN';
            paragraphInput = result.input?.markdownText || '';
            break;
          case 'VISUALIZATION':
            inputType = 'VISUALIZATION';
            paragraphInput = '';
            break;
          case 'DEEP_RESEARCH_AGENT':
            inputType = AI_RESPONSE_TYPE;
            paragraphInput = result.input?.question || '';
            break;
          default:
            inputType = AI_RESPONSE_TYPE;
            paragraphInput = inputValue;
        }
      }
      onSubmit({ inputText: paragraphInput, inputType });
      onSuccess();
    } catch (error) {
      console.error('Error occured during submission', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleAgentSelectSubmit,
  };
};
