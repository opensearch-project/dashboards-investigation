/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiMarkdownFormat,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useEffectOnce, useObservable } from 'react-use';
import { useContext } from 'react';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { NotebookReactContext } from '../../../context_provider/context_provider';
import { NotebookType } from '../../../../../../common/types/notebooks';

const inputPlaceholderString =
  'Type %md on the first line to define the input type. \nCode block starts here.';

export const MarkdownParagraph = ({
  paragraphState,
  actionDisabled,
}: {
  paragraphState: ParagraphState;
  actionDisabled: boolean;
}) => {
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const context = useContext(NotebookReactContext);
  const { notebookType } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );
  const { runParagraph } = context.paragraphHooks;

  const runParagraphHandler = async () => {
    paragraphState.updateUIState({
      isRunning: true,
    });
    try {
      await runParagraph({
        id: paragraphValue.id,
      });
    } catch (e) {
      console.log(`Fail to run paragraph`, e);
    } finally {
      paragraphState.updateUIState({
        isRunning: false,
      });
    }
  };

  useEffectOnce(() => {
    if (notebookType !== NotebookType.AGENTIC) {
      paragraphState.updateUIState({
        actions: [
          {
            name: 'Edit',
            action: () => {
              paragraphState.updateUIState({ viewMode: 'view_both' });
            },
          },
        ],
      });
    }
  });

  const isRunning = paragraphValue.uiState?.isRunning;

  return (
    <>
      <div style={{ width: '100%' }}>
        {paragraphValue.uiState?.viewMode !== 'output_only' ? (
          <>
            <EuiCompressedTextArea
              data-test-subj={`editorArea-${paragraphValue.id}`}
              placeholder={inputPlaceholderString}
              id={`editorArea-${paragraphValue.id}`}
              className="editorArea"
              fullWidth
              disabled={!!isRunning || actionDisabled}
              onChange={(evt) => {
                paragraphState.updateInput({
                  inputText: evt.target.value,
                });
                paragraphState.updateUIState({
                  isOutputStale: true,
                });
              }}
              onKeyPress={(evt) => {
                if (evt.key === 'Enter' && evt.shiftKey) {
                  runParagraphHandler();
                }
              }}
              value={paragraphValue.input.inputText}
              autoFocus
            />
            <EuiSpacer size="m" />
            {actionDisabled ? null : (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSmallButton
                    data-test-subj={`runRefreshBtn-${paragraphValue.id}`}
                    onClick={() => {
                      runParagraphHandler();
                      paragraphState.updateUIState({ viewMode: 'output_only' });
                    }}
                  >
                    {ParagraphState.getOutput(paragraphValue)?.result !== '' ? 'Save' : 'Run'}
                  </EuiSmallButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            <EuiSpacer size="m" />
          </>
        ) : null}
      </div>
      {isRunning ? (
        <EuiLoadingContent />
      ) : (
        <EuiText
          className="wrapAll markdown-output-text"
          data-test-subj="markdownOutputText"
          size="s"
          style={{
            // TODO remove this when add buttons
            ...(notebookType === NotebookType.AGENTIC && { marginBottom: '-1.5rem' }),
          }}
        >
          <EuiMarkdownFormat>
            {ParagraphState.getOutput(paragraphValue)?.result || ''}
          </EuiMarkdownFormat>
        </EuiText>
      )}
    </>
  );
};
