/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import MarkdownRender from '@nteract/markdown';
import { useContext } from 'react';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { NotebookReactContext } from '../../../context_provider/context_provider';

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
  const { runParagraph } = useContext(NotebookReactContext).paragraphHooks;

  const runParagraphHandler = async () => {
    paragraphState.updateUIState({
      isRunning: true,
    });
    try {
      await runParagraph({
        id: paragraphValue.id,
      });
    } catch (e) {
      // do nothing
    } finally {
      paragraphState.updateUIState({
        isRunning: false,
      });
    }
  };

  const isRunning = paragraphValue.uiState?.isRunning;

  return (
    <>
      <EuiSpacer size="s" />
      <div style={{ width: '100%' }}>
        {paragraphValue.uiState?.viewMode !== 'output_only' ? (
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
        ) : (
          <EuiCodeBlock
            data-test-subj={`paraInputCodeBlock-${paragraphValue.id}`}
            language={paragraphValue.input.inputText.match(/^%(sql|md)/)?.[1]}
            overflowHeight={200}
            paddingSize="s"
          >
            {paragraphValue.input.inputText}
          </EuiCodeBlock>
        )}
      </div>
      <EuiSpacer size="m" />
      {actionDisabled ? null : (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiSmallButton
              data-test-subj={`runRefreshBtn-${paragraphValue.id}`}
              onClick={() => {
                runParagraphHandler();
              }}
            >
              {ParagraphState.getOutput(paragraphValue)?.result !== '' ? 'Refresh' : 'Run'}
            </EuiSmallButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />
      {isRunning ? (
        <EuiLoadingContent />
      ) : (
        <EuiText
          className="wrapAll markdown-output-text"
          data-test-subj="markdownOutputText"
          size="s"
        >
          <MarkdownRender source={ParagraphState.getOutput(paragraphValue)?.result} />
        </EuiText>
      )}
    </>
  );
};
