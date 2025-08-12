/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  EuiTextArea,
  EuiSelectable,
  EuiSelectableOption,
  EuiInputPopover,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import autosize from 'autosize';
import { useEffectOnce } from 'react-use';
import { NoteBookServices } from 'public/types';
import { ActionMetadata, actionsMetadata } from '../../../../common/constants/actions';
import { NotebookReactContext } from '../context_provider/context_provider';
import { executeMLCommonsAgent, getMLCommonsConfig } from '../../../utils/ml_commons_apis';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

interface InputPanelProps {
  onCreateParagraph: (paragraphInput: string, inputType: string) => Promise<void>;
  dataSourceId: string | undefined | null;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onCreateParagraph, dataSourceId }) => {
  const [isLoading, setIsLoading] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const context = useContext(NotebookReactContext);
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();

  useEffectOnce(() => {
    if (textareaRef.current) {
      autosize(textareaRef.current);
    }
    return () => {
      if (textareaRef.current) {
        autosize.destroy(textareaRef.current);
      }
    };
  });

  useEffect(() => {
    if (!context?.state.value.isLoading) {
      setInputValue('');
    }
  }, [context?.state.value.isLoading]);

  const paragraphOptions: EuiSelectableOption[] = [
    { label: 'PPL', key: 'PPL', 'data-test-subj': 'paragraph-type-ppl' },
    { label: 'MARKDOWN', key: 'MARKDOWN', 'data-test-subj': 'paragraph-type-markdown' },
    {
      label: 'Visualization',
      key: 'VISUALIZATION',
      'data-test-subj': 'paragraph-type-visualization',
    },
    {
      label: 'Continue investigation',
      key: 'DEEP_RESEARCH_AGENT',
      'data-test-subj': 'paragraph-type-deep-research',
    },
    { label: 'SQL', key: 'SQL', 'data-test-subj': 'paragraph-type-sql' },
  ];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if the input contains %
    if (value.endsWith('%')) {
      setIsPopoverOpen(true);
    } else if (isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleParagraphSelection = async (options: EuiSelectableOption[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    if (selectedOption) {
      const paragraphType = selectedOption.key as string;

      // Determine paragraph type and input content
      let inputType = 'CODE';
      let paragraphInput = '';

      switch (paragraphType) {
        case 'PPL':
          inputType = 'CODE';
          paragraphInput = '%ppl\n';
          break;
        case 'SQL':
          inputType = 'CODE';
          paragraphInput = '%sql\n';
          break;
        case 'MARKDOWN':
          inputType = 'CODE';
          paragraphInput = '%md\n';
          break;
        case 'VISUALIZATION':
          inputType = 'VISUALIZATION';
          paragraphInput = '';
          break;
        case 'DEEP_RESEARCH_AGENT':
          inputType = 'DEEP_RESEARCH';
          paragraphInput = '';
          break;
        default:
          inputType = 'CODE';
          paragraphInput = '';
      }

      await onCreateParagraph(paragraphInput, inputType);

      closePopover();
      setInputValue('');
    }
  };

  // TODO: Submit use's question
  const onSubmit = async () => {
    setIsLoading(true);

    if (!textareaRef.current || !textareaRef.current.value.trim()) {
      return;
    }

    try {
      const response = await executeActionSelectionAgent(
        textareaRef.current.value,
        actionsMetadata
      );
      const rawResult = JSON.parse(response?.inference_results?.[0]?.output?.[0]?.result);
      const jsonMatch = rawResult?.content?.[0]?.text?.match(/\{[\s\S]*\}/);
      let inputType = 'DEEP_RESEARCH';
      let paragraphInput = '';
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        switch (result.action) {
          case 'PPL':
            inputType = 'CODE';
            paragraphInput = '%ppl\n' + result.input?.inputQuery || '';
            break;
          case 'MARKDOWN':
            inputType = 'CODE';
            paragraphInput = '%md\n' + result.input?.markdownText || '';
            break;
          case 'VISUALIZATION':
            inputType = 'VISUALIZATION';
            paragraphInput = '';
            break;
          case 'DEEP_RESEARCH_AGENT':
            inputType = 'DEEP_RESEARCH';
            paragraphInput = result.input?.question || '';
            break;
          default:
            inputType = 'CODE';
            paragraphInput = textareaRef.current.value;
        }
      }
      await onCreateParagraph(paragraphInput, inputType);
      setInputValue('');
      textareaRef.current.style.height = '45px';
    } catch (error) {
      console.error('Error occured during submission', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EuiInputPopover
      input={
        <div>
          <EuiTextArea
            inputRef={textareaRef}
            // autoFocus
            fullWidth
            style={{
              minHeight: 45,
              maxHeight: 200,
              borderRadius: 6,
              backgroundColor: 'white',
              paddingRight: 40,
            }}
            placeholder={'Type % to show paragraph options'}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={isLoading}
            rows={1}
            resize="none"
            data-test-subj="notebook-paragraph-input-panel"
          />
          {isLoading ? (
            <EuiLoadingSpinner
              size="m"
              style={{
                position: 'absolute',
                right: 10,
                top: '30%',
              }}
              data-test-subj="notebook-input-loading"
            />
          ) : (
            <EuiIcon
              type="rocket"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              onClick={onSubmit}
              data-test-subj="notebook-input-icon"
            />
          )}
        </div>
      }
      fullWidth
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      style={{
        position: 'sticky',
        bottom: 10,
        width: 700,
        marginLeft: '50%',
        transform: 'translateX(-50%)',
        // marginTop: 'auto',
      }}
    >
      <div>
        <EuiSelectable
          options={paragraphOptions}
          singleSelection="always"
          onChange={handleParagraphSelection}
          data-test-subj="paragraph-type-selector"
        >
          {(list) => <div>{list}</div>}
        </EuiSelectable>
      </div>
    </EuiInputPopover>
  );
};
