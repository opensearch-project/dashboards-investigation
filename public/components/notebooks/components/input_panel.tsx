/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext } from 'react';
import { useObservable } from 'react-use';
import { EuiPanel } from '@elastic/eui';
import type { ParagraphState } from 'common/state/paragraph_state';
import { NotebookType, ParagraphInputType } from '../../../../common/types/notebooks';
import { MultiVariantInput } from './input/multi_variant_input';
import { useParagraphs } from '../../../../public/hooks/use_paragraphs';
import { NotebookReactContext } from '../context_provider/context_provider';

interface InputPanelProps {
  onParagraphCreated?: (paragraphState: ParagraphState<unknown, unknown>) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onParagraphCreated }) => {
  const { createParagraph, runParagraph } = useParagraphs();

  const context = useContext(NotebookReactContext);
  const notebookState = useObservable(context.state.getValue$(), context.state.value);
  const paragraphs = notebookState.paragraphs.map((item) => item.value);
  const { notebookType, dataSourceId: notebookDataSourceId } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );

  const handleCreateParagraph = useCallback(
    async ({ inputText, inputType, parameters }: ParagraphInputType, dataSourceId?: string) => {
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

      try {
        // Add paragraph at the end
        const createParagraphRes = await createParagraph({
          index: paragraphs.length,
          input: {
            inputText: typedInputText,
            inputType: createInputType,
            parameters,
          },
          dataSourceMDSId: dataSourceId === undefined ? notebookDataSourceId : dataSourceId,
        });
        if (createParagraphRes) {
          onParagraphCreated?.(createParagraphRes);
          await runParagraph({
            id: createParagraphRes.value.id,
          });
        }
      } catch (err) {
        console.log(`Error while creating paragraph ${err}`);
      }
    },
    [paragraphs.length, createParagraph, runParagraph, onParagraphCreated, notebookDataSourceId]
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
        <MultiVariantInput
          onSubmit={handleCreateParagraph}
          dataSourceId={notebookType === NotebookType.CLASSIC ? '' : notebookDataSourceId}
        />
      </EuiPanel>
    </div>
  );
};
