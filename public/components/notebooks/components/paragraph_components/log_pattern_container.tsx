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
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
  EuiCodeBlock,
  EuiBadge,
  EuiAccordion,
  EuiBasicTable,
  EuiTableFieldDataColumnType,
  EuiIcon,
  EuiPopover,
  EuiEmptyPrompt,
  EuiProgress,
  EuiLoadingSpinner,
  EuiButtonIcon,
} from '@elastic/eui';
import moment from 'moment';
import { useObservable } from 'react-use';
import { ParaType } from '../../../../../common/types/notebooks';
import {
  LogPattern,
  LogPatternService,
  LogSequenceEntry,
} from '../../../../services/requests/log_pattern';
import { CoreStart } from '../../../../../../../src/core/public';
import { NotebookReactContext } from '../../context_provider/context_provider';

interface LogPatternContainerProps {
  para: ParaType;
  http: CoreStart['http'];
}

interface CombinedResult {
  logInsights: LogPattern[];
  patternMapDifference: LogPattern[];
  EXCEPTIONAL: { [key: string]: string }; // Map of hash -> sequence
  BASE: { [key: string]: string }; // Map of hash -> sequence
}

interface LoadingStatus {
  isLoading: boolean;
  completedRequests: number;
  totalRequests: number;
  currentlyRunning: string[];
  completedSteps: string[];
  progress: number;
}

export const LogPatternContainer: React.FC<LogPatternContainerProps> = ({ para, http }) => {
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoading: false,
    completedRequests: 0,
    totalRequests: 0,
    currentlyRunning: [],
    completedSteps: [],
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CombinedResult>({
    logInsights: [],
    patternMapDifference: [],
    EXCEPTIONAL: {},
    BASE: {},
  });
  const [hasData, setHasData] = useState<boolean>(false);
  const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({});
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
            from: context.timeRange.from,
            to: context.timeRange.to,
          }
        : null,
    };
  }, [context]);

  // Memoize para.out to prevent array reference changes
  const memoizedParaOut = useMemo(() => {
    return para.out && para.out.length > 0 ? para.out[0] : null;
  }, [para.out]);

  const togglePopover = (id: string) => {
    setOpenPopovers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const closePopover = (id: string) => {
    setOpenPopovers((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // Helper function to convert map to array for table rendering
  const convertMapToSequenceArray = (map: { [key: string]: string }): LogSequenceEntry[] => {
    return Object.entries(map || {}).map(([traceId, sequence]) => ({
      traceId,
      sequence,
    }));
  };

  useEffect(() => {
    // log all dependent variables that trigger this effect
    console.log('LogPatternContainer re-rendered due to:');
    console.log('memoizedParaOut:', memoizedParaOut);
    console.log('memoizedContextValues:', memoizedContextValues);

    // Parse the result from the paragraph output if available
    if (memoizedParaOut) {
      try {
        if (memoizedParaOut) {
          setResult(JSON.parse(memoizedParaOut));
          setHasData(true);
          return;
        }
      } catch (err) {
        setError('Failed to parse log pattern results');
        console.error('Error parsing log pattern results:', err);
        return;
      }
    }
    if (!memoizedContextValues) {
      return;
    }

    // If no cached results, fetch new analysis
    if (!memoizedContextValues?.timeRange) {
      setError('No time range context available for log pattern analysis');
      return;
    }

    const { from, to } = memoizedContextValues.timeRange;
    const duration = moment.duration(moment(to).diff(moment(from)));

    // Define all API requests
    const apiRequests = [
      {
        name: 'Log Insights Analysis',
        params: {
          selectionStartTime: moment(from).toISOString(),
          selectionEndTime: moment(to).toISOString(),
          timeField: memoizedContextValues.timeField,
          logMessageField: 'body',
          indexName: memoizedContextValues.index,
          dataSourceMDSId: memoizedContextValues.dataSourceId,
        },
        resultKey: 'logInsights' as keyof CombinedResult,
      },
      {
        name: 'Pattern Difference Analysis',
        params: {
          baselineStartTime: moment(from).subtract(duration).toISOString(),
          baselineEndTime: moment(from).toISOString(),
          selectionStartTime: moment(from).toISOString(),
          selectionEndTime: moment(to).toISOString(),
          timeField: memoizedContextValues.timeField,
          logMessageField: 'body',
          indexName: memoizedContextValues.index,
          dataSourceMDSId: memoizedContextValues.dataSourceId,
        },
        resultKey: 'patternMapDifference' as keyof CombinedResult,
      },
      {
        name: 'Log Sequence Analysis',
        params: {
          baselineStartTime: moment(from).subtract(duration).toISOString(),
          baselineEndTime: moment(from).toISOString(),
          selectionStartTime: moment(from).toISOString(),
          selectionEndTime: moment(to).toISOString(),
          timeField: memoizedContextValues.timeField,
          traceIdField: 'traceId',
          logMessageField: 'body',
          indexName: memoizedContextValues.index,
          dataSourceMDSId: memoizedContextValues.dataSourceId,
        },
        resultKey: 'EXCEPTIONAL' as keyof CombinedResult,
      },
    ];

    // Initialize loading status
    setLoadingStatus({
      isLoading: true,
      completedRequests: 0,
      totalRequests: apiRequests.length,
      currentlyRunning: apiRequests.map((req) => req.name),
      completedSteps: [],
      progress: 0,
    });
    setError(null);
    setHasData(false);

    const fetchLogPatternAnalysis = async () => {
      const logPatternService = new LogPatternService(http);

      // Start all requests in parallel
      apiRequests.forEach(async (request) => {
        try {
          const analysisResult = await logPatternService.analyzeLogPatterns(request.params);
          console.log(`Analysis result for ${request.name}:`, analysisResult);

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
            console.log('result::::::', newResult);
            return newResult;
          });

          // Update loading status
          setLoadingStatus((prevStatus) => {
            const completedRequests = prevStatus.completedRequests + 1;
            const newCurrentlyRunning = prevStatus.currentlyRunning.filter(
              (name) => name !== request.name
            );
            const newCompletedSteps = [...prevStatus.completedSteps, request.name];
            const progress = Math.round((completedRequests / apiRequests.length) * 100);

            return {
              ...prevStatus,
              completedRequests,
              currentlyRunning: newCurrentlyRunning,
              completedSteps: newCompletedSteps,
              progress,
              isLoading: completedRequests < apiRequests.length,
            };
          });

          setHasData(true);
        } catch (err) {
          console.error(`Error in ${request.name}:`, err);
          if (err.response.status === 404) {
            setError('Log sequence/pattern analysis agent not found');
            return;
          }

          // Update loading status even for failed requests
          setLoadingStatus((prevStatus) => {
            const completedRequests = prevStatus.completedRequests + 1;
            const newCurrentlyRunning = prevStatus.currentlyRunning.filter(
              (name) => name !== request.name
            );
            const newCompletedSteps = [...prevStatus.completedSteps, `${request.name} (failed)`];
            const progress = Math.round((completedRequests / apiRequests.length) * 100);

            return {
              ...prevStatus,
              completedRequests,
              currentlyRunning: newCurrentlyRunning,
              completedSteps: newCompletedSteps,
              progress,
              isLoading: completedRequests < apiRequests.length,
            };
          });
        }
      });
    };

    fetchLogPatternAnalysis();
  }, [memoizedContextValues, memoizedParaOut, http]);

  useEffect(() => {
    if (loadingStatus.completedRequests === loadingStatus.totalRequests) {
      // save result to saved object
    }
  }, [loadingStatus.completedRequests, loadingStatus.totalRequests]);

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

  // Columns for log insights table
  const logInsightsColumns: Array<EuiTableFieldDataColumnType<LogPattern>> = [
    {
      field: 'pattern',
      name: 'Pattern',
      render: (pattern: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ),
      width: '50%',
    },
    {
      field: 'count',
      name: 'Count',
      render: (count: number) => <EuiBadge color="primary">{count}</EuiBadge>,
      width: '10%',
    },
    {
      field: 'sampleLogs',
      name: 'Examples',
      render: (examples: string[], record: LogPattern) => {
        const popoverId = `examples-${record.pattern.replace(/[^a-zA-Z0-9]/g, '')}-${record.count}`;
        return (
          <EuiPopover
            id={popoverId}
            button={
              <EuiButtonIcon
                iconType="inspect"
                aria-label="View examples"
                onClick={() => togglePopover(popoverId)}
              />
            }
            isOpen={openPopovers[popoverId] || false}
            closePopover={() => closePopover(popoverId)}
            panelPaddingSize="s"
          >
            <div style={{ maxWidth: '400px', maxHeight: '300px', overflowY: 'auto' }}>
              <EuiTitle size="xs">
                <h4>Log Examples</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              {examples?.slice(0, 10).map((example, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
                    {example}
                  </EuiCodeBlock>
                </div>
              ))}
              {examples?.length > 10 && (
                <EuiText
                  size="xs"
                  color="subdued"
                  style={{ textAlign: 'center', marginTop: '8px' }}
                >
                  ... and {examples.length - 10} more examples
                </EuiText>
              )}
            </div>
          </EuiPopover>
        );
      },
      width: '10%',
    },
  ];

  // Columns for pattern difference table
  const patternDiffColumns: Array<EuiTableFieldDataColumnType<LogPattern>> = [
    {
      field: 'pattern',
      name: 'Pattern',
      render: (pattern: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ),
      width: '60%',
    },
    {
      field: 'selection',
      name: 'Selection',
      render: (count: number) => {
        const color = count > 0 ? 'danger' : count < 0 ? 'success' : 'hollow';
        const icon = count > 0 ? 'sortUp' : count < 0 ? 'sortDown' : 'minus';
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={color}>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
    {
      field: 'base',
      name: 'Baseline',
      render: (count: number) => {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiBadge>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
    {
      field: 'lift',
      name: 'Lift',
      render: (count: number) => {
        // Show '-' if lift is empty, undefined, null, or NaN
        if (count === null || count === undefined || isNaN(count)) {
          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">-</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiBadge>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
  ];

  // Columns for sequence entries table
  const sequenceColumns: Array<EuiTableFieldDataColumnType<LogSequenceEntry>> = [
    {
      field: 'traceId',
      name: 'Trace ID',
      render: (traceId: string) => (
        <EuiText size="s" style={{ fontFamily: 'monospace' }}>
          {traceId}
        </EuiText>
      ),
      width: '30%',
    },
    {
      field: 'sequence',
      name: 'Log Sequence',
      render: (sequence: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {sequence}
        </EuiCodeBlock>
      ),
      width: '70%',
    },
  ];

  const renderSection = (title: string, data: any[], columns: any[], emptyMessage: string) => {
    if (!data || data.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h4>No {title.toLowerCase()} found</h4>}
          body={<p>{emptyMessage}</p>}
        />
      );
    }

    return (
      <EuiBasicTable
        items={data}
        columns={columns}
        tableCaption={title}
        noItemsMessage={emptyMessage}
      />
    );
  };

  // Function to sort patternMapDifference with multiple sort options
  const sortPatternMapDifference = (patterns: LogPattern[]) => {
    if (!patterns || patterns.length === 0) {
      return patterns;
    }

    return [...patterns].sort((a, b) => {
      // Sort order 1: Sort by lift (descending - highest lift first)
      const liftDiff = Math.abs(b.lift || 0) - Math.abs(a.lift || 0);
      if (liftDiff !== 0) {
        return liftDiff;
      }

      // Sort order 2: Sort by selection (descending - highest absolute selection first)
      const selectionDiff = Math.abs(b.selection || 0) - Math.abs(a.selection || 0);
      return selectionDiff;
    });
  };

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
                  </span>
                  <strong>Investigation Period:</strong>{' '}
                  {moment(context.timeRange.from).format('MMM DD, YYYY HH:mm')} to{' '}
                  {moment(context.timeRange.to).format('MMM DD, YYYY HH:mm')}
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
                {moment(context.timeRange.from)
                  .subtract(
                    moment.duration(
                      moment(context.timeRange.to).diff(moment(context.timeRange.from))
                    )
                  )
                  .format('MMM DD, YYYY HH:mm')}{' '}
                to {moment(context.timeRange.from).format('MMM DD, YYYY HH:mm')}
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
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="s">
                <EuiText size="s" textAlign="center">
                  <strong>Log Insights</strong>
                  <br />
                  <EuiBadge color="primary">{result.logInsights?.length || 0}</EuiBadge>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="s">
                <EuiText size="s" textAlign="center">
                  <strong>Pattern Differences</strong>
                  <br />
                  <EuiBadge color="accent">{result.patternMapDifference?.length || 0}</EuiBadge>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="s">
                <EuiText size="s" textAlign="center">
                  <strong>Exceptional Sequences</strong>
                  <br />
                  <EuiBadge color="danger">{Object.keys(result.EXCEPTIONAL || {}).length}</EuiBadge>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="s">
                <EuiText size="s" textAlign="center">
                  <strong>Baseline Sequences</strong>
                  <br />
                  <EuiBadge color="hollow">{Object.keys(result.BASE || {}).length}</EuiBadge>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          {/* Log Insights Section */}
          <EuiAccordion
            id="logInsights"
            buttonContent={
              <EuiTitle size="xs">
                <h4>
                  <EuiIcon type="inspect" />
                  &nbsp;Log Insights ({result.logInsights?.length || 0})
                </h4>
              </EuiTitle>
            }
            initialIsOpen={true}
          >
            <EuiSpacer size="s" />
            {renderSection(
              'Log Insights',
              result.logInsights || [],
              logInsightsColumns,
              'No log insights patterns were detected in the analysis.'
            )}
          </EuiAccordion>

          <EuiSpacer size="m" />

          {/* Pattern Differences Section */}
          <EuiAccordion
            id="patternDifferences"
            buttonContent={
              <EuiTitle size="xs">
                <h4>
                  <EuiIcon type="diff" />
                  &nbsp;Pattern Differences ({result.patternMapDifference?.length || 0})
                </h4>
              </EuiTitle>
            }
            initialIsOpen={result.patternMapDifference && result.patternMapDifference.length > 0}
          >
            <EuiSpacer size="s" />
            {renderSection(
              'Pattern Differences',
              sortPatternMapDifference(result.patternMapDifference || []),
              patternDiffColumns,
              'No significant pattern differences found between baseline and selection periods.'
            )}
          </EuiAccordion>

          <EuiSpacer size="m" />

          {/* Exceptional Sequences Section */}
          <EuiAccordion
            id="exceptionalSequences"
            buttonContent={
              <EuiTitle size="xs">
                <h4>
                  <EuiIcon type="alert" color="danger" />
                  &nbsp;Exceptional Sequences ({Object.keys(result.EXCEPTIONAL || {}).length})
                </h4>
              </EuiTitle>
            }
            initialIsOpen={result.EXCEPTIONAL && Object.keys(result.EXCEPTIONAL).length > 0}
          >
            <EuiSpacer size="s" />
            {renderSection(
              'Exceptional Sequences',
              convertMapToSequenceArray(result.EXCEPTIONAL),
              sequenceColumns,
              'No exceptional log sequences detected during the analysis period.'
            )}
          </EuiAccordion>

          <EuiSpacer size="m" />

          {/* Baseline Sequences Section */}
          <EuiAccordion
            id="baselineSequences"
            buttonContent={
              <EuiTitle size="xs">
                <h4>
                  <EuiIcon type="timeline" />
                  &nbsp;Baseline Sequences ({Object.keys(result.BASE || {}).length})
                </h4>
              </EuiTitle>
            }
            initialIsOpen={false}
          >
            <EuiSpacer size="s" />
            {renderSection(
              'Baseline Sequences',
              convertMapToSequenceArray(result.BASE),
              sequenceColumns,
              'No baseline log sequences available for comparison.'
            )}
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
};
