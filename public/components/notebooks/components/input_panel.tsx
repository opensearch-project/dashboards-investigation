/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext } from 'react';
import { useObservable } from 'react-use';
import { EuiPanel } from '@elastic/eui';
import { MultiVariantInput } from './input/multi_variant_input';
import { ParagraphInputType } from './input/types';
import { useParagraphs } from '../../../../public/hooks/use_paragraphs';
import { NotebookReactContext } from '../context_provider/context_provider';

export const InputPanel: React.FC = () => {
  const { createParagraph } = useParagraphs();

  const context = useContext(NotebookReactContext);
  const notebookState = useObservable(context.state.getValue$(), context.state.value);
  const paragraphs = notebookState.paragraphs.map((item) => item.value);
  const { dataSourceId } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );

  const handleCreateParagraph = useCallback(
    async ({ inputText, inputType, parameters }: ParagraphInputType) => {
      let typedInputText = inputText;
      let createInputType = inputType;

      switch (inputType) {
        case 'SQL':
          typedInputText = `%sql\n${inputText}`;
          createInputType = 'CODE';
          break;
        case 'PPL':
          typedInputText = `%ppl\n${inputText}`;
          createInputType = 'CODE';
          break;
        case 'MARKDOWN':
          typedInputText = `%md\n${inputText}`;
          break;
      }

      // Add paragraph at the end
      await createParagraph({
        index: paragraphs.length,
        input: {
          inputText: typedInputText,
          inputType: createInputType,
          parameters,
        },
        dataSourceMDSId: dataSourceId,
      });
    },
    [paragraphs.length, dataSourceId, createParagraph]
  );

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 10,
        width: 900,
        marginLeft: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
      }}
    >
      <EuiPanel grow borderRadius="xl" hasBorder hasShadow paddingSize="s">
        <MultiVariantInput onSubmit={handleCreateParagraph} />
      </EuiPanel>
    </div>
  );
};
