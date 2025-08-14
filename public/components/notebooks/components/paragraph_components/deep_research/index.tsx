/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
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
import type { DeepResearchOutputResult } from 'common/types/notebooks';

import { DataSourceSelectorProps } from '../../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { dataSourceFilterFn } from '../../../../../../common/utils/shared';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import { ParagraphDataSourceSelector } from '../../data_source_selector';
import { getSystemPrompts } from '../../helpers/custom_modals/system_prompt_setting_modal';

import { AgentsSelector } from './agents_selector';
import { DeepResearchOutput } from './deep_research_output';

export const DeepResearchParagraph = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<DeepResearchOutputResult | { agent_id?: string } | string>;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const selectedDataSource = paragraphValue?.dataSourceMDSId;
  const onSelectedDataSource: DataSourceSelectorProps['onSelectedDataSource'] = (event) => {
    paragraphState.updateValue({
      dataSourceMDSId: event[0] ? event[0].id : undefined,
    });
  };

  const { runParagraph, saveParagraph } = useParagraphs();
  const rawOutputResult = paragraphValue.output?.[0]?.result;
  // FIXME: Read paragraph out directly once all notebooks store object as output
  const outputResult = useMemo<DeepResearchOutputResult | { agent_id?: string } | undefined>(() => {
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

  const [deepResearchAgentId, setDeepResearchAgentId] = useState<string | undefined>(
    outputResult?.agent_id
  );

  const isRunning = paragraphValue.uiState?.isRunning;

  const runParagraphHandler = async () => {
    paragraphState.updateInput({
      parameters: {
        prompts: getSystemPrompts(),
      },
    });
    await runParagraph({
      id: paragraphValue.id,
    });
  };

  return (
    <>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <EuiFlexItem>
          <ParagraphDataSourceSelector
            disabled={!!isRunning}
            fullWidth={false}
            onSelectedDataSource={onSelectedDataSource}
            defaultOption={
              selectedDataSource !== undefined ? [{ id: selectedDataSource }] : undefined
            }
            dataSourceFilter={dataSourceFilterFn}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AgentsSelector
            value={deepResearchAgentId}
            dataSourceMDSId={selectedDataSource}
            onChange={async (value) => {
              setDeepResearchAgentId(value);
              // FIXME move to deep research paragraph
              await saveParagraph({
                paragraphStateValue: ParagraphState.updateOutputResult(paragraphValue, {
                  agent_id: value,
                }),
              });
            }}
            disabled={!!isRunning}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCompressedFormRow fullWidth={true}>
        <div style={{ width: '100%' }}>
          {paragraphValue.uiState?.viewMode !== 'output_only' ? (
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
          input={paragraphValue.input.parameters || paragraphValue.input}
        />
      )}
    </>
  );
};
