/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
import React from 'react';
import {
  EuiBadge,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useEffectOnce, useObservable } from 'react-use';
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
  const output = ParagraphState.getOutput(paragraphValue);
  const isFindingParagraph =
    output?.result.startsWith('Importance:') && output.result.includes('Description:');

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

  useEffectOnce(() => {
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
  });

  const isRunning = paragraphValue.uiState?.isRunning;

  if (isFindingParagraph && output) {
    const description = /Description\:\s*(.*)\n/.exec(output.result)?.[1];
    const evidence = /Evidence\:\s*(.*)/.exec(output.result)?.[1];

    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween" style={{ marginInlineEnd: 24 }}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>Finding: {description}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              Updated {moment(paragraphValue.dateModified).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />
        <div>{evidence}</div>
      </>
    );
  }

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
      {paragraphValue.aiGenerated && <EuiBadge>AI Generated</EuiBadge>}
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
