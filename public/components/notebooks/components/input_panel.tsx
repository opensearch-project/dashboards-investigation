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
} from '@elastic/eui';
import autosize from 'autosize';
import { useEffectOnce } from 'react-use';
import { ACTION_TYPES } from '../reducers/paragraphReducer';
import { NotebookReactContext } from '../context_provider/context_provider';

interface InputPanelProps {
  onCreateParagraph: (paragraphInput: string, inputType: string) => Promise<void>;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onCreateParagraph }) => {
  const [inputValue, setInputValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const context = useContext(NotebookReactContext);

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
    if (!context?.reducer?.state.isLoading) {
      setInputValue('');
    }
  }, [context?.reducer?.state.isLoading]);

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
  ];

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
      // Dispatch action to create new paragraph
      context?.reducer?.dispatch({
        actionType: ACTION_TYPES.CREATE_PARAGRAPH_REQUEST,
        payload: {
          paragraphType,
        },
      });

      // Determine paragraph type and input content
      let inputType = 'CODE';
      let paragraphInput = '';

      switch (paragraphType) {
        case 'PPL':
          inputType = 'CODE';
          paragraphInput = '%ppl\n';
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

      // Dispatch action to create the paragraph successfully
      context?.reducer?.dispatch({
        actionType: ACTION_TYPES.CREATE_PARAGRAPH_SUCCESS,
      });

      closePopover();
    }
  };

  // TODO: Submit use's question
  const onSubmit = async () => {
    if (!textareaRef.current || !textareaRef.current.value.trim()) {
      return;
    }

    textareaRef.current.value = '';
    textareaRef.current.style.height = '45px';
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
            rows={1}
            resize="none"
            data-test-subj="notebook-paragraph-input-panel"
          />
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
