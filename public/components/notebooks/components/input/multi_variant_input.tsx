/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiInputPopover,
  EuiPopover,
  EuiSelectable,
  EuiSmallButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import autosize from 'autosize';
import { useEffectOnce } from 'react-use';
import { InputTypeSelector } from './input_type_selector';
import { QueryPanel } from './query_panel';
import { InputProvider, useInputContext } from './input_context';
import { NotebookInput } from './notebook_input';
import { MarkDownInput } from './markdown_input';
import { AI_RESPONSE_TYPE } from '../../../../../common/constants/notebooks';

interface MultiVariantInputProps {
  input?: { inputText: string; inputType: string };
  onSubmit: (paragraphInput: any, inputType: string) => void;
}

const MultiVariantInputContent: React.FC = () => {
  const {
    currInputType,
    isParagraphSelectionOpen,
    setCurrInputType,
    setIsPopoverOpen,
    isParagraph,
    handleParagraphSelection,
  } = useInputContext();

  const getInputTypeSelector = () => {
    return (
      <InputTypeSelector allowSelect current={currInputType} onInputTypeChange={setCurrInputType} />
    );
  };

  const getInputMenu = () => {
    if (isParagraph) {
      return null;
    }
    return (
      <EuiPopover
        panelPaddingSize="none"
        button={
          <EuiSmallButtonIcon
            aria-label="Open input menu"
            iconType="boxesHorizontal"
            onClick={() => {}}
          />
        }
        closePopover={() => {}}
      >
        TODO
      </EuiPopover>
    );
  };

  const getInputComponent = () => {
    switch (currInputType) {
      case AI_RESPONSE_TYPE:
        return <NotebookInput placeholder="Type % to show paragraph options" />;
      case 'PPL':
        return <QueryPanel prependWidget={getInputTypeSelector()} appendWidget={getInputMenu()} />;
      case 'MARKDOWN':
        return <MarkDownInput />;
      case 'DEEP_RESEARCH_AGENT':
        return <NotebookInput placeholder="Ask question to trigger deep research agent" />;
      case 'VISUALIZATION':
        return <></>;
      default:
        return <></>;
    }
  };

  const { textareaRef, paragraphOptions } = useInputContext();

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

  return (
    <>
      {currInputType !== 'PPL' && (
        <>
          <EuiFlexGroup dir="row" gutterSize="none" justifyContent="spaceBetween">
            {getInputTypeSelector()}
            {getInputMenu()}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      )}

      <EuiInputPopover
        fullWidth
        repositionOnScroll
        input={getInputComponent()}
        isOpen={isParagraphSelectionOpen}
        closePopover={() => setIsPopoverOpen(false)}
        data-test-subj="multiVariantInput"
      >
        <EuiSelectable
          options={paragraphOptions}
          singleSelection="always"
          onChange={handleParagraphSelection}
          data-test-subj="paragraph-type-selector"
        >
          {(list) => <div>{list}</div>}
        </EuiSelectable>
      </EuiInputPopover>
    </>
  );
};

export const MultiVariantInput: React.FC<MultiVariantInputProps> = (props) => {
  return (
    <InputProvider onSubmit={props.onSubmit} input={props.input}>
      <MultiVariantInputContent />
    </InputProvider>
  );
};
