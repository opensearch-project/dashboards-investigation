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
  EuiMarkdownFormat,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
  const output = ParagraphState.getOutput(paragraphValue);
  const isAIGeneratedFinding =
    output?.result.startsWith('Importance:') && output.result.includes('Description:');
  const isUserAddedFinding =
    notebookType === NotebookType.AGENTIC && paragraphValue.aiGenerated === false;

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

  if (isUserAddedFinding && output) {
    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween" style={{ marginInlineEnd: 20 }}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>User Finding</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap' }}>
              Created&nbsp;
              {moment(paragraphValue.dateModified).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiText
          className="wrapAll markdown-output-text"
          data-test-subj="markdownOutputText"
          size="s"
        >
          <EuiMarkdownFormat>{output.result}</EuiMarkdownFormat>
        </EuiText>
      </>
    );
  }

  if (isAIGeneratedFinding && output) {
    const description = /Description\:\s*(.*)\n/.exec(output.result)?.[1];
    const evidence = /Evidence\:\s*(.*)/s.exec(output.result)?.[1];
    const importance = /Importance\:\s*(.*)/.exec(output.result)?.[1];
    const aHasTypology =
      description?.toLowerCase().includes('topology') ||
      evidence?.toLowerCase().includes('topology');

    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween" style={{ marginInlineEnd: 20 }}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>
                Finding: {description} | Importance: {importance}
                <EuiBadge style={{ marginInlineStart: 8, transform: 'translateY(-1.5px)' }}>
                  AI Generated
                </EuiBadge>
              </span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap' }}>
              Updated&nbsp;{moment(paragraphValue.dateModified).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {aHasTypology ? <pre>{evidence}</pre> : <div>{evidence}</div>}
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
      {isRunning ? (
        <EuiLoadingContent />
      ) : (
        <EuiText
          className="wrapAll markdown-output-text"
          data-test-subj="markdownOutputText"
          size="s"
        >
          <EuiMarkdownFormat>
            {ParagraphState.getOutput(paragraphValue)?.result || ''}
          </EuiMarkdownFormat>
        </EuiText>
      )}
    </>
  );
};
