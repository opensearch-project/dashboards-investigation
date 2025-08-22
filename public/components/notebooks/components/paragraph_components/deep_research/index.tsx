/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useContext, useCallback } from 'react';
import { useObservable } from 'react-use';
import {
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiSpacer,
} from '@elastic/eui';

import type { NoteBookServices } from 'public/types';
import type { DeepResearchInputParameters, DeepResearchOutputResult } from 'common/types/notebooks';

import { DataSourceSelectorProps } from '../../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { dataSourceFilterFn } from '../../../../../../common/utils/shared';
import {
  ParagraphState,
  ParagraphStateValue,
} from '../../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import { ParagraphDataSourceSelector } from '../../data_source_selector';
import { getSystemPrompts } from '../../helpers/custom_modals/system_prompt_setting_modal';

import { AgentsSelector } from './agents_selector';
import { DeepResearchOutput } from './deep_research_output';
import { NotebookReactContext } from '../../../context_provider/context_provider';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../../common/constants/notebooks';

export const DeepResearchParagraph = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<DeepResearchOutputResult | string, DeepResearchInputParameters>;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { state } = useContext(NotebookReactContext);
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const contextValue = useObservable(state.value.context.getValue$(), state.value.context.value);
  const selectedDataSource = paragraphValue?.dataSourceMDSId;
  const onSelectedDataSource: DataSourceSelectorProps['onSelectedDataSource'] = (event) => {
    paragraphState.updateValue({
      dataSourceMDSId: event[0] ? event[0].id : undefined,
    });
  };

  const { runParagraph } = useParagraphs();
  const rawOutputResult = ParagraphState.getOutput(paragraphValue)?.result;
  // FIXME: Read paragraph out directly once all notebooks store object as output
  const outputResult = useMemo<DeepResearchOutputResult | undefined>(() => {
    if (typeof rawOutputResult !== 'string' || typeof rawOutputResult === 'undefined') {
      return rawOutputResult;
    }
    if (!rawOutputResult) {
      return undefined;
    }
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawOutputResult);
    } catch (e) {
      console.error('Failed to parse output result', e);
    }
    if (typeof parsedResult?.task_id === 'string') {
      return {
        taskId: parsedResult.task_id,
      };
    }
    return undefined;
  }, [rawOutputResult]);

  const deepResearchAgentId = paragraphValue.input.parameters?.agentId || outputResult?.agent_id;

  const isRunning = paragraphValue.uiState?.isRunning;

  const runParagraphHandler = useCallback(
    async (inputPayload?: Partial<ParagraphStateValue['input']>) => {
      paragraphState.updateInput({
        ...inputPayload,
        parameters: {
          prompts: getSystemPrompts(),
        },
      });
      await runParagraph({
        id: paragraphValue.id,
      });
    },
    [runParagraph, paragraphState, paragraphValue.id]
  );

  useEffect(() => {
    if (
      !paragraphValue.uiState?.isRunning &&
      paragraphValue.input.inputType === AI_RESPONSE_TYPE &&
      paragraphValue.input.parameters?.agentId &&
      !outputResult?.taskId
    ) {
      // automatically run ai response paragraph when create initially
      runParagraphHandler({
        inputText: paragraphValue.input.inputText,
      });
    }
  }, [paragraphValue, outputResult, runParagraphHandler]);

  useEffect(() => {
    if (
      !paragraphValue.uiState?.isRunning &&
      !paragraphValue.input.inputText &&
      paragraphValue.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE &&
      contextValue.initialGoal &&
      paragraphValue.input.parameters?.agentId &&
      !outputResult?.taskId
    ) {
      // automatically run paragraph if there is initial goal
      runParagraphHandler({
        inputText: contextValue.initialGoal,
      });
    }
  }, [contextValue, paragraphValue, outputResult, runParagraphHandler]);

  const isDisabled =
    !!contextValue.initialGoal && paragraphValue.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE;

  return (
    <>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <EuiFlexItem>
          <ParagraphDataSourceSelector
            disabled={!!isRunning || isDisabled}
            fullWidth={false}
            onSelectedDataSource={onSelectedDataSource}
            selectedDataSourceId={selectedDataSource}
            dataSourceFilter={dataSourceFilterFn}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AgentsSelector
            value={deepResearchAgentId}
            dataSourceMDSId={selectedDataSource}
            onChange={(value) => {
              paragraphState.updateInput({
                parameters: {
                  agentId: value,
                },
              });
            }}
            disabled={!!isRunning || isDisabled}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCompressedFormRow fullWidth={true}>
        <div style={{ width: '100%' }}>
          {!isDisabled ? (
            <EuiCompressedTextArea
              data-test-subj={`editorArea-${paragraphValue.id}`}
              placeholder="Ask a question"
              id={`editorArea-${paragraphValue.id}`}
              className="editorArea"
              fullWidth
              disabled={!!isRunning}
              onChange={(evt) => {
                paragraphState.updateInput({
                  inputText: evt.target.value,
                });
                paragraphState.updateUIState({
                  isOutputStale: true,
                });
              }}
              onKeyUp={(evt) => {
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
              overflowHeight={200}
              paddingSize="s"
            >
              {paragraphValue.input.inputText}
            </EuiCodeBlock>
          )}
        </div>
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            data-test-subj={`runRefreshBtn-${paragraphValue.id}`}
            onClick={() => {
              runParagraphHandler();
            }}
          >
            {outputResult && 'taskId' in outputResult ? 'Refresh' : 'Run'}
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {outputResult && 'taskId' in outputResult && (
        <DeepResearchOutput
          outputResult={outputResult}
          dataSourceId={selectedDataSource}
          http={http}
          input={paragraphValue.input.parameters || (paragraphValue.input as any)}
        />
      )}
    </>
  );
};
