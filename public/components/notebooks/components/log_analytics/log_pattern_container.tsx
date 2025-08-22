/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCallOut, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { useObservable } from 'react-use';
import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';
import {
  LogPatternAnalysisParams,
  LogPatternService,
} from '../../../../services/requests/log_pattern';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../hooks/use_paragraphs';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { LogInsight } from './components/log_insight';
import { PatternDifference } from './components/pattern_difference';
import { LogSequence } from './components/log_sequence';
import { SummaryStatistics } from './components/summary_statistics';
import { IndexInsightContent } from '../../../../../common/types/notebooks';

const LOG_INSIGHTS_ANALYSIS = 'Log Insights Analysis';
const PATTERN_DIFFERENCE_ANALYSIS = 'Pattern Difference Analysis';
const LOG_SEQUENCE_ANALYSIS = 'Log Sequence Analysis';

interface LogPatternContainerProps {
  paragraphState: ParagraphState<
    LogPatternAnalysisResult,
    { index: string; timeField: string; insight: IndexInsightContent }
  >;
}

interface LoadingStatus {
  isLoading: boolean;
  isLoadingLogInsights: boolean;
  isLoadingPatternMapDifference: boolean;
  isLoadingLogSequence: boolean;
  completedRequests: number;
  totalRequests: number;
  currentlyRunning: string[];
  completedSteps: string[];
}

export const LogPatternContainer: React.FC<LogPatternContainerProps> = ({ paragraphState }) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoading: false,
    isLoadingLogInsights: false,
    isLoadingPatternMapDifference: false,
    isLoadingLogSequence: false,
    completedRequests: 0,
    totalRequests: 0,
    currentlyRunning: [],
    completedSteps: [],
  });
  const [error, setError] = useState<string | null>(null);
  const paragraph = useObservable(paragraphState.getValue$());
  const [result, setResult] = useState<LogPatternAnalysisResult>({
    logInsights: [],
    patternMapDifference: [],
    EXCEPTIONAL: {},
    BASE: {},
  });
  const { saveParagraph } = useParagraphs();
  const [hasData, setHasData] = useState<boolean>(false);
  const notebookReactContext = useContext(NotebookReactContext);

  const notebookState = useObservable(notebookReactContext.state.getValue$());
  const context = notebookState?.context.value;

  // Memoize context values to prevent unnecessary re-renders
  const memoizedContextValues = useMemo(() => {
    if (!context) return null;
    return {
      dataSourceId: context.dataSourceId,
      index: paragraph?.input.parameters?.index || context.index,
      timeField: paragraph?.input.parameters?.timeField || context.timeField,
      timeRange: context.timeRange
        ? {
            selectionFrom: context.timeRange.selectionFrom,
            selectionTo: context.timeRange.selectionTo,
            baselineFrom: context.timeRange.baselineFrom,
            baselineTo: context.timeRange.baselineTo,
          }
        : null,
      indexInsight: paragraph?.input.parameters?.insight || context.indexInsight,
    };
  }, [context, paragraph?.input.parameters]);

  // Memoize para.out to prevent array reference changes
  const memoizedParaOut = useMemo(() => {
    return paragraph?.output?.[0].result;
  }, [paragraph]);

  useEffect(() => {
    if (!memoizedContextValues) {
      return;
    }

    // If no cached results, fetch new analysis
    if (!memoizedContextValues?.timeRange) {
      setError('No time range context available for log pattern analysis');
      return;
    }

    const {
      selectionFrom,
      selectionTo,
      baselineFrom,
      baselineTo,
    } = memoizedContextValues.timeRange;

    const apiRequestsParam: LogPatternAnalysisParams = {
      selectionStartTime: moment(selectionFrom).toISOString(),
      selectionEndTime: moment(selectionTo).toISOString(),
      timeField: memoizedContextValues.timeField,
      logMessageField: memoizedContextValues?.indexInsight?.log_message_field,
      indexName: memoizedContextValues.index,
      dataSourceMDSId: memoizedContextValues.dataSourceId,
    };

    // Define all API requests
    const apiRequests = [
      {
        name: LOG_INSIGHTS_ANALYSIS,
        params: apiRequestsParam,
        resultKey: 'logInsights' as keyof LogPatternAnalysisResult,
      },
    ];

    if (baselineFrom && baselineTo) {
      apiRequests.push({
        name: PATTERN_DIFFERENCE_ANALYSIS,
        params: {
          baselineStartTime: moment(baselineFrom).toISOString(),
          baselineEndTime: moment(baselineTo).toISOString(),
          ...apiRequestsParam,
        },
        resultKey: 'patternMapDifference' as keyof LogPatternAnalysisResult,
      });
    }

    if (memoizedContextValues?.indexInsight?.trace_id_field) {
      apiRequests.push({
        name: LOG_SEQUENCE_ANALYSIS,
        params: {
          baselineStartTime: moment(baselineFrom).toISOString(),
          baselineEndTime: moment(baselineTo).toISOString(),
          traceIdField: memoizedContextValues?.indexInsight?.trace_id_field,
          ...apiRequestsParam,
        },
        resultKey: 'EXCEPTIONAL' as keyof LogPatternAnalysisResult,
      });
    }

    // Parse the result from the paragraph output if available
    if (memoizedParaOut) {
      try {
        if (memoizedParaOut) {
          setResult(memoizedParaOut);
          setLoadingStatus({
            isLoading: false,
            isLoadingLogInsights: false,
            isLoadingPatternMapDifference: false,
            isLoadingLogSequence: false,
            completedRequests: apiRequests.length,
            totalRequests: apiRequests.length,
            currentlyRunning: [],
            completedSteps: apiRequests.map((req) => req.name),
          });
          setHasData(true);
          return;
        }
      } catch (err) {
        setError('Failed to parse log pattern results');
        return;
      }
    }

    // Initialize loading status
    setLoadingStatus({
      isLoading: true,
      isLoadingLogInsights: apiRequests.some((request) => request.name === LOG_INSIGHTS_ANALYSIS),
      isLoadingPatternMapDifference: apiRequests.some(
        (request) => request.name === PATTERN_DIFFERENCE_ANALYSIS
      ),
      isLoadingLogSequence: apiRequests.some((request) => request.name === LOG_SEQUENCE_ANALYSIS),
      completedRequests: 0,
      totalRequests: apiRequests.length,
      currentlyRunning: [], // Will be updated as each request starts
      completedSteps: [],
    });
    setError(null);
    setHasData(false);

    const updateLoadingStatus = (requestName: string, isSuccess: boolean) => {
      setLoadingStatus((prevStatus) => {
        const completedRequests = prevStatus.completedRequests + 1;
        const newCompletedSteps = [
          ...prevStatus.completedSteps,
          isSuccess ? requestName : `${requestName} (failed)`,
        ];

        return {
          ...prevStatus,
          isLoadingLogInsights:
            requestName === LOG_INSIGHTS_ANALYSIS ? false : prevStatus.isLoadingLogInsights,
          isLoadingPatternMapDifference:
            requestName === PATTERN_DIFFERENCE_ANALYSIS
              ? false
              : prevStatus.isLoadingPatternMapDifference,
          isLoadingLogSequence:
            requestName === LOG_SEQUENCE_ANALYSIS ? false : prevStatus.isLoadingLogSequence,
          completedRequests,
          currentlyRunning: [],
          completedSteps: newCompletedSteps,
          isLoading: completedRequests < apiRequests.length,
        };
      });
    };

    const fetchLogPatternAnalysis = async () => {
      const logPatternService = new LogPatternService(http);

      // Run requests sequentially
      for (const request of apiRequests) {
        // Update loading status to show current request
        setLoadingStatus((prevStatus) => ({
          ...prevStatus,
          currentlyRunning: [request.name],
        }));

        try {
          const analysisResult = await logPatternService.analyzeLogPatterns(request.params);

          // Update result progressively as each request completes
          setResult((prevResult) => {
            const newResult = { ...prevResult };

            // Map the API response to the correct result key
            if (request.resultKey === 'logInsights' && analysisResult.logInsights) {
              newResult.logInsights = analysisResult.logInsights;
            } else if (
              request.resultKey === 'patternMapDifference' &&
              analysisResult.patternMapDifference
            ) {
              newResult.patternMapDifference = analysisResult.patternMapDifference;
            } else if (request.resultKey === 'EXCEPTIONAL' && analysisResult.EXCEPTIONAL) {
              newResult.EXCEPTIONAL = analysisResult.EXCEPTIONAL;
              // Also add BASELINE if available
              if (analysisResult.BASE) {
                newResult.BASE = analysisResult.BASE;
              }
            }
            return newResult;
          });

          // Update loading status
          updateLoadingStatus(request.name, true);
          setHasData(true);
        } catch (err) {
          if (err.response?.status === 404) {
            setError('Log sequence/pattern analysis agent not found');
            return;
          }

          // Update loading status even for failed requests
          updateLoadingStatus(request.name, false);
        }
      }
    };

    fetchLogPatternAnalysis();
  }, [memoizedContextValues, memoizedParaOut, http]);

  useEffect(() => {
    if (
      loadingStatus.completedRequests === loadingStatus.totalRequests &&
      loadingStatus.completedRequests > 0 &&
      hasData &&
      !ParagraphState.getOutput(paragraph)?.result.logInsights &&
      !paragraph?.uiState?.isRunning
    ) {
      if (paragraph) {
        saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraph, result),
        });
      }
    }
  }, [
    loadingStatus.completedRequests,
    loadingStatus.totalRequests,
    result,
    hasData,
    paragraph,
    saveParagraph,
  ]);

  if (error) {
    return (
      <EuiCallOut title="Error" color="danger">
        <p>{error}</p>
      </EuiCallOut>
    );
  }

  if (!hasData && !loadingStatus.isLoading) {
    return (
      <EuiCallOut title="No results" color="primary">
        <p>
          {i18n.translate('notebook.log.sequence.paragraph.no.result', {
            defaultMessage:
              'No log pattern analysis results available. Run the analysis to see results.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      {context?.index && context?.timeRange && (
        <>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('notebook.log.sequence.paragraph.title', {
                defaultMessage: 'Log sequence analysis',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('notebook.log.sequence.paragraph.subtitle', {
              defaultMessage:
                'Analyzing log patterns from {index} index by comparing two time periods',
              values: {
                index: memoizedContextValues?.index,
              },
            })}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />

      {/* Summary Statistics */}
      <SummaryStatistics result={result} />
      <EuiSpacer size="m" />

      {/* Log Insights Section */}
      <LogInsight
        logInsights={result.logInsights || []}
        isLoadingLogInsights={loadingStatus.isLoadingLogInsights}
      />

      <EuiSpacer size="s" />

      {/* Pattern Differences Section */}
      <PatternDifference
        patternMapDifference={result.patternMapDifference || []}
        isLoadingPatternMapDifference={loadingStatus.isLoadingPatternMapDifference}
      />

      <EuiSpacer size="s" />

      {/* Log Sequences Section */}
      <LogSequence
        exceptionalSequences={result.EXCEPTIONAL}
        baselineSequences={result.BASE}
        isLoadingLogSequence={loadingStatus.isLoadingLogSequence}
      />
    </EuiPanel>
  );
};
