/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiProgress,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import moment from 'moment';
import { useObservable } from 'react-use';
import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import { NoteBookServices } from 'public/types';
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

interface LogPatternContainerProps {
  paragraphState: ParagraphState<LogPatternAnalysisResult>;
}

interface LoadingStatus {
  isLoading: boolean;
  completedRequests: number;
  totalRequests: number;
  currentlyRunning: string[];
  completedSteps: string[];
  progress: number;
}

export const LogPatternContainer: React.FC<LogPatternContainerProps> = ({ paragraphState }) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoading: false,
    completedRequests: 0,
    totalRequests: 0,
    currentlyRunning: [],
    completedSteps: [],
    progress: 0,
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
      index: context.index,
      timeField: context.timeField,
      timeRange: context.timeRange
        ? {
            selectionFrom: context.timeRange.selectionFrom,
            selectionTo: context.timeRange.selectionTo,
            baselineFrom: context.timeRange.baselineFrom,
            baselineTo: context.timeRange.baselineTo,
          }
        : null,
      indexInsight: context.indexInsight,
    };
  }, [context]);

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
        name: 'Log Insights Analysis',
        params: apiRequestsParam,
        resultKey: 'logInsights' as keyof LogPatternAnalysisResult,
      },
    ];

    if (baselineFrom && baselineTo) {
      apiRequests.push({
        name: 'Pattern Difference Analysis',
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
        name: 'Log Sequence Analysis',
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
            completedRequests: apiRequests.length,
            totalRequests: apiRequests.length,
            currentlyRunning: [],
            completedSteps: apiRequests.map((req) => req.name),
            progress: 100,
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
      completedRequests: 0,
      totalRequests: apiRequests.length,
      currentlyRunning: [], // Will be updated as each request starts
      completedSteps: [],
      progress: 0,
    });
    setError(null);
    setHasData(false);

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
          setLoadingStatus((prevStatus) => {
            const completedRequests = prevStatus.completedRequests + 1;
            const newCompletedSteps = [...prevStatus.completedSteps, request.name];
            const progress = Math.round((completedRequests / apiRequests.length) * 100);

            return {
              ...prevStatus,
              completedRequests,
              currentlyRunning: [],
              completedSteps: newCompletedSteps,
              progress,
              isLoading: completedRequests < apiRequests.length,
            };
          });

          setHasData(true);
        } catch (err) {
          if (err.response?.status === 404) {
            setError('Log sequence/pattern analysis agent not found');
            return;
          }

          // Update loading status even for failed requests
          setLoadingStatus((prevStatus) => {
            const completedRequests = prevStatus.completedRequests + 1;
            const newCompletedSteps = [...prevStatus.completedSteps, `${request.name} (failed)`];
            const progress = Math.round((completedRequests / apiRequests.length) * 100);

            return {
              ...prevStatus,
              completedRequests,
              currentlyRunning: [],
              completedSteps: newCompletedSteps,
              progress,
              isLoading: completedRequests < apiRequests.length,
            };
          });
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

  // Loading status rendering UI - now shows parallel progress
  const renderLoadingStatus = () => {
    if (!loadingStatus.isLoading && !hasData) return null;

    return (
      <EuiPanel color="subdued" paddingSize="s">
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                {loadingStatus.isLoading ? (
                  <EuiLoadingSpinner size="m" />
                ) : (
                  <EuiIcon type="check" color="success" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {loadingStatus.isLoading
                      ? `Analyzing... (${loadingStatus.completedRequests}/${loadingStatus.totalRequests})`
                      : 'Analysis Complete'}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <div style={{ width: '300px' }}>
              <EuiProgress value={loadingStatus.progress} max={100} color="primary" size="s" />
            </div>
          </EuiFlexItem>

          {loadingStatus.currentlyRunning.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                Running: {loadingStatus.currentlyRunning.join(', ')}
              </EuiText>
            </EuiFlexItem>
          )}

          {loadingStatus.completedSteps.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="success">
                Completed: {loadingStatus.completedSteps.join(', ')}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  };

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
        <p>No log pattern analysis results available. Run the analysis to see results.</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      {context?.index && context?.timeRange && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            Analyzing log patterns from <strong>{context.index}</strong> index by comparing two
            times periods:
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <>
                  <span role="img" aria-label="magnifying glass">
                    🔍
                  </span>{' '}
                  <strong>Investigation Period:</strong>{' '}
                  {moment(context.timeRange.selectionFrom).format('MMM DD, YYYY HH:mm')} to{' '}
                  {moment(context.timeRange.selectionTo).format('MMM DD, YYYY HH:mm')}
                  <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                    (the time range you want to investigate)
                  </span>
                </>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <span role="img" aria-label="bar chart">
                  📊
                </span>{' '}
                <strong>Baseline Period:</strong>{' '}
                {moment(context.timeRange.baselineFrom).format('MMM DD, YYYY HH:mm')} to{' '}
                {moment(context.timeRange.baselineTo).format('MMM DD, YYYY HH:mm')}
                <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                  (normal period for comparison to identify anomalies)
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="m" />

      {/* Loading Status */}
      {renderLoadingStatus()}
      {(loadingStatus.isLoading || hasData) && <EuiSpacer size="m" />}

      {/* Summary Statistics */}
      {hasData && (
        <>
          <SummaryStatistics result={result} />
          <EuiSpacer size="l" />

          {/* Log Insights Section */}
          <LogInsight logInsights={result.logInsights || []} />

          <EuiSpacer size="m" />

          {/* Pattern Differences Section */}
          <PatternDifference patternMapDifference={result.patternMapDifference || []} />

          <EuiSpacer size="m" />

          {/* Log Sequences Section */}
          <LogSequence exceptionalSequences={result.EXCEPTIONAL} baselineSequences={result.BASE} />
        </>
      )}
    </EuiPanel>
  );
};
