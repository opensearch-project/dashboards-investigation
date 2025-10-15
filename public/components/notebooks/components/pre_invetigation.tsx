/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { NoteBookSource } from '../../../../common/types/notebooks';

import { DataDistributionContainer } from './data_distribution/data_distribution_container';
import { LogPatternContainer } from './log_analytics/log_pattern_container';

import { NotebookContextProvider, getDefaultState } from '../context_provider/context_provider';
import { ParagraphState } from '../../../../common/state/paragraph_state';
import { TopContextState } from '../../../../common/state/top_context_state';
import {
  AnomalyVisualizationAnalysisOutputResult,
  SummaryDataItem,
} from '../../../../common/types/notebooks';
import { LogPatternAnalysisResult } from '../../../../common/types/log_pattern';

export interface PreInvestigationAnalysisProps {
  source: NoteBookSource;
  index: string;
  timeRange: {
    selectionFrom: number;
    selectionTo: number;
    baselineFrom: number;
    baselineTo: number;
  };
  timeField: string;
  dataSourceId: string;
  filters: Array<Record<string, any>>;
  variables: {
    pplQuery?: string;
    alert?: {
      start_time: string;
      last_notification_time: string;
      severity: string;
      monitor_id: string;
      alertNumber: number;
      trigger_name: string;
      monitor_name: string;
    };
    [key: string]: unknown;
  };
  logMessageField?: string;
  traceIdField?: string;
}

// Internal component that will use the containers with the proper context
export const PreInvestigationAnalysisInternal: React.FC<PreInvestigationAnalysisProps> = ({
  timeRange,
  timeField,
  index,
  source,
  logMessageField,
  traceIdField,
}) => {
  // Create paragraph states for both components
  const [dataDistributionParagraphState] = useState(
    new ParagraphState<AnomalyVisualizationAnalysisOutputResult>({
      id: 'data-distribution-paragraph',
      input: {
        inputText: '',
        inputType: 'DATA_DISTRIBUTION',
        parameters: {
          index,
          timeField,
          source,
        },
      },
      output: [
        {
          result: {
            fieldComparison: [] as SummaryDataItem[],
          },
          outputType: 'application/json',
        },
      ],
      uiState: {
        viewMode: 'view_both',
        inQueue: false,
        isRunning: false,
        isOutputStale: false,
        actions: [],
        dataDistribution: {
          fetchDataLoading: false,
          distributionLoading: false,
          error: undefined,
        },
      },
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    })
  );

  const [logPatternParagraphState] = useState(
    new ParagraphState<
      LogPatternAnalysisResult,
      {
        index: string;
        timeField: string;
        insight: any;
        timeRange?: {
          selectionFrom: number;
          selectionTo: number;
          baselineFrom: number;
          baselineTo: number;
        };
      }
    >({
      id: 'log-pattern-paragraph',
      input: {
        inputText: '',
        inputType: 'LOG_ANALYTICS',
        parameters: {
          index,
          timeField,
          timeRange,
          insight: {
            index_name: index,
            is_log_index: true,
            log_message_field: logMessageField,
            trace_id_field: traceIdField,
            time_field: timeField,
          },
        },
      },
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      output: [
        {
          result: {
            logInsights: [],
            patternMapDifference: [],
            EXCEPTIONAL: [],
          },
          outputType: 'application/json',
        },
      ],
    })
  );

  return (
    <>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <LogPatternContainer paragraphState={logPatternParagraphState} />
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <DataDistributionContainer paragraphState={dataDistributionParagraphState} />
      </EuiPanel>
    </>
  );
};

// Main component that wraps the internal component with context provider
export const PreInvestigationAnalysis: React.FC<PreInvestigationAnalysisProps> = (props) => {
  const { timeRange, timeField, index, dataSourceId, filters, source, variables } = props;

  // Create a notebook state with the provided context
  const [notebookState] = useState(
    getDefaultState({
      context: new TopContextState({
        timeRange,
        timeField,
        index,
        dataSourceId,
        filters,
        source,
        variables,
      }),
    })
  );

  return (
    <NotebookContextProvider state={notebookState}>
      <PreInvestigationAnalysisInternal {...props} />
    </NotebookContextProvider>
  );
};
