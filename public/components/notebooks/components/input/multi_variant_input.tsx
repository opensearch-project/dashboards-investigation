/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiInputPopover, EuiSelectable, EuiSpacer } from '@elastic/eui';
import autosize from 'autosize';
import { useEffectOnce } from 'react-use';
import { ParagraphInputType } from 'common/types/notebooks';
import { InputTypeSelector } from './input_type_selector';
import { QueryPanel } from './query_panel';
import { InputProvider, useInputContext } from './input_context';
import { NotebookInput } from './notebook_input';
import { MarkDownInput } from './markdown_input';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import { VisualizationInput } from './visualization_input';

interface MultiVariantInputProps<TParameters = unknown> {
  input?: ParagraphInputType<TParameters>;
  onSubmit: (input: ParagraphInputType<TParameters>, dataSourceId?: string) => void;
  actionDisabled?: boolean;
  dataSourceId?: string;
  aiFeatureEnabled?: boolean;
}

const MultiVariantInputContent: React.FC = () => {
  const {
    currInputType,
    isParagraphSelectionOpen,
    setIsParagraphSelectionOpen,
    handleSetCurrInputType,
    handleParagraphSelection,
  } = useInputContext();

  const getInputTypeSelector = useCallback(
    () => (
      <InputTypeSelector
        allowSelect
        current={currInputType}
        onInputTypeChange={handleSetCurrInputType}
      />
    ),
    [currInputType, handleSetCurrInputType]
  );

  const getInputComponent = () => {
    switch (currInputType) {
      case AI_RESPONSE_TYPE:
        return (
          <NotebookInput placeholder="Ask AI with question or type % to show paragraph options" />
        );
      case 'PPL':
      case 'SQL':
        return <QueryPanel prependWidget={getInputTypeSelector()} />;
      case 'MARKDOWN':
        return <MarkDownInput />;
      case DEEP_RESEARCH_PARAGRAPH_TYPE:
        return <NotebookInput placeholder="Ask question to trigger deep research agent" />;
      case 'VISUALIZATION':
        return <VisualizationInput prependWidget={getInputTypeSelector()} />;
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
      {currInputType !== 'PPL' && currInputType !== 'SQL' && currInputType !== 'VISUALIZATION' && (
        // Input type selector for query panel is a part of the component already
        <>
          <EuiFlexGroup dir="row" gutterSize="none" justifyContent="spaceBetween">
            {getInputTypeSelector()}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      )}

      <EuiInputPopover
        fullWidth
        repositionOnScroll
        input={getInputComponent()}
        isOpen={isParagraphSelectionOpen}
        closePopover={() => setIsParagraphSelectionOpen(false)}
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
    <InputProvider
      onSubmit={props.onSubmit}
      input={props.input}
      dataSourceId={props.dataSourceId}
      aiFeatureEnabled={props.aiFeatureEnabled}
      isDisabled={!!props.actionDisabled}
    >
      <MultiVariantInputContent />
    </InputProvider>
  );
};
