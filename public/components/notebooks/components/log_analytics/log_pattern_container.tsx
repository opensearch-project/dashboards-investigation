/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCallOut, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { useObservable } from 'react-use';
import { LogPattern, LogPatternAnalysisResult, LogSequenceEntry } from 'common/types/log_pattern';
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
import { PatternDifference, sortPatternMapDifference } from './components/pattern_difference';
import { LogSequence } from './components/log_sequence';
import { SummaryStatistics } from './components/summary_statistics';
import { IndexInsightContent, NotebookContext } from '../../../../../common/types/notebooks';
import { parsePPLQuery } from '../../../../../common/utils';
import { DataDistributionService } from '../data_distribution/data_distribution_service';
import { dateFormat } from '../../../../../common/constants/notebooks';

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
  const paragraphRef = useRef(paragraph);
  const [result, setResult] = useState<LogPatternAnalysisResult>({
    logInsights: [],
    patternMapDifference: [],
    EXCEPTIONAL: [],
  });
  const { saveParagraph } = useParagraphs();
  const [initialized, setInitialized] = useState<boolean>(false);
  const [pendingSaveOutput, setPendingSaveOutput] = useState<boolean>(false);
  const notebookReactContext = useContext(NotebookReactContext);

  const notebookState = useObservable(notebookReactContext.state.getValue$());
  const context = notebookState?.context.value;

  const dataService = useMemo(() => new DataDistributionService(), []);
  const [memoizedContextValues, setMemoizedContextValues] = useState<Partial<
    NotebookContext
  > | null>(null);

  useEffect(() => {
    paragraphRef.current = paragraph;
  }, [paragraph]);

  useEffect(() => {
    const processContextValues = async () => {
      if (!context) {
        setMemoizedContextValues(null);
        return;
      }

      const currentPara = paragraphRef.current;

      const timeField = currentPara?.input.parameters?.timeField || context.timeField;
      const index = currentPara?.input.parameters?.index || context.index;

      const pplQuery = context.variables?.pplQuery;
      const timeRange = [context.timeRange?.selectionFrom, context.timeRange?.selectionTo];
      // merge time range from PPL query with time picker value from context
      if (pplQuery && context.timeRange) {
        const conditions = parsePPLQuery(pplQuery).compareExprs;
        // time field with expressions like date_sub(time, interval 1 hour) are not supported
        const isTimeFieldCondition = (filed: string) =>
          filed === timeField || filed === `\`${timeField}\``;
        const timeConditions =
          conditions?.filter(
            (con) => isTimeFieldCondition(con.left) || isTimeFieldCondition(con.right)
          ) || [];
        for (const con of timeConditions) {
          const timeFieldOnLeft = isTimeFieldCondition(con.left);
          const timeValue = timeFieldOnLeft ? con.right : con.left;
          // the time value could be expression like `date_sub(now(), interval 1 hour)`
          const pplToEval = `source=${index} | head 1 | eval timeValue = ${timeValue} | fields timeValue`;
          dataService.setConfig(context.dataSourceId, index || '', timeField || '');
          const data = await dataService.fetchPPlData(pplToEval);
          if (data && data.length > 0) {
            const time = moment.utc(data[0].timeValue).valueOf();
            // merge
            if (timeFieldOnLeft) {
              if (con.op === '<' || con.op === '<=') {
                timeRange[1] = timeRange[1] !== undefined ? Math.min(time, timeRange[1]) : time;
              } else {
                timeRange[0] = timeRange[0] !== undefined ? Math.max(time, timeRange[0]) : time;
              }
            } else {
              if (con.op === '>' || con.op === '>=') {
                timeRange[1] = timeRange[1] !== undefined ? Math.min(time, timeRange[1]) : time;
              } else {
                timeRange[0] = timeRange[0] !== undefined ? Math.max(time, timeRange[0]) : time;
              }
            }
          }
        }
      }

      setMemoizedContextValues({
        dataSourceId: context.dataSourceId,
        index,
        timeField,
        timeRange: context.timeRange
          ? {
              selectionFrom: timeRange[0]!,
              selectionTo: timeRange[1]!,
              baselineFrom: context.timeRange.baselineFrom,
              baselineTo: context.timeRange.baselineTo,
            }
          : undefined,
        indexInsight: currentPara?.input.parameters?.insight || context.indexInsight,
      });
    };

    processContextValues();
  }, [context, dataService]);

  useEffect(() => {
    if (initialized) return;
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
      selectionStartTime: moment(selectionFrom).utc().format(dateFormat),
      selectionEndTime: moment(selectionTo).utc().format(dateFormat),
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
          baselineStartTime: moment(baselineFrom).utc().format(dateFormat),
          baselineEndTime: moment(baselineTo).utc().format(dateFormat),
          ...apiRequestsParam,
        },
        resultKey: 'patternMapDifference' as keyof LogPatternAnalysisResult,
      });
    }

    if (baselineFrom && baselineTo && memoizedContextValues?.indexInsight?.trace_id_field) {
      apiRequests.push({
        name: LOG_SEQUENCE_ANALYSIS,
        params: {
          baselineStartTime: moment(baselineFrom).utc().format(dateFormat),
          baselineEndTime: moment(baselineTo).utc().format(dateFormat),
          traceIdField: memoizedContextValues?.indexInsight?.trace_id_field,
          ...apiRequestsParam,
        },
        resultKey: 'EXCEPTIONAL' as keyof LogPatternAnalysisResult,
      });
    }

    // Parse the result from the paragraph output if available
    if (paragraphRef.current?.output?.[0].result) {
      setResult(paragraphRef.current?.output?.[0].result);
      setLoadingStatus({
        isLoadingLogInsights: false,
        isLoadingPatternMapDifference: false,
        isLoadingLogSequence: false,
        completedRequests: apiRequests.length,
        totalRequests: apiRequests.length,
        currentlyRunning: [],
        completedSteps: apiRequests.map((req) => req.name),
      });
      setInitialized(true);
      return;
    }

    // Initialize loading status
    setLoadingStatus({
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
        };
      });
    };

    let remainingRequest = apiRequests.length;

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
              newResult.patternMapDifference = sortPatternMapDifference(
                analysisResult.patternMapDifference || []
              );
            } else if (request.resultKey === 'EXCEPTIONAL' && analysisResult.EXCEPTIONAL) {
              newResult.EXCEPTIONAL = analysisResult.EXCEPTIONAL;
            }
            return newResult;
          });

          // Update loading status
          updateLoadingStatus(request.name, true);
          remainingRequest--;
        } catch (err) {
          // Update loading status even for failed requests
          updateLoadingStatus(request.name, false);
        }
      }
      if (remainingRequest === 0) {
        setInitialized(true);
        setPendingSaveOutput(true);
      }
    };

    fetchLogPatternAnalysis();
  }, [memoizedContextValues, initialized, http]);

  const handleLogInsightExclude = useCallback((item: LogPattern) => {
    setResult((prevResult) => {
      const newResult = { ...prevResult };
      newResult.logInsights = newResult.logInsights.map((logInsight) => {
        if (logInsight.pattern === item.pattern) {
          logInsight.excluded = !logInsight.excluded;
        }
        return logInsight;
      });
      return newResult;
    });
    setPendingSaveOutput(true);
  }, []);

  const handlePatternDifferenceExclude = useCallback((item: LogPattern) => {
    setResult((prevResult) => {
      const newResult = { ...prevResult };
      newResult.patternMapDifference = newResult.patternMapDifference?.map((pattern) => {
        if (pattern.pattern === item.pattern) {
          pattern.excluded = !pattern.excluded;
        }
        return pattern;
      });
      return newResult;
    });
    setPendingSaveOutput(true);
  }, []);

  const handleLogSequenceExclude = useCallback((item: LogSequenceEntry) => {
    setResult((prevResult) => {
      const newResult = { ...prevResult };
      newResult.EXCEPTIONAL = newResult.EXCEPTIONAL?.map((sequence) => {
        if (sequence.traceId === item.traceId) {
          sequence.excluded = !sequence.excluded;
        }
        return sequence;
      });
      return newResult;
    });
    setPendingSaveOutput(true);
  }, []);

  useEffect(() => {
    if (pendingSaveOutput) {
      if (paragraphRef.current) {
        saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraphRef.current, result),
        });
      }
      setPendingSaveOutput(false);
    }
  }, [pendingSaveOutput, result, saveParagraph]);

  if (error) {
    return (
      <EuiCallOut title="Error" color="danger">
        <p>{error}</p>
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
        onExclude={handleLogInsightExclude}
      />

      <EuiSpacer size="s" />

      {/* Pattern Differences Section */}
      <PatternDifference
        patternMapDifference={result.patternMapDifference || []}
        isLoadingPatternMapDifference={loadingStatus.isLoadingPatternMapDifference}
        isNotApplicable={!memoizedContextValues?.timeRange?.baselineFrom}
        onExclude={handlePatternDifferenceExclude}
      />

      <EuiSpacer size="s" />

      {/* Log Sequences Section */}
      <LogSequence
        exceptionalSequences={result.EXCEPTIONAL}
        baselineSequences={result.BASE}
        isLoadingLogSequence={loadingStatus.isLoadingLogSequence}
        isNotApplicable={
          !(
            memoizedContextValues?.timeRange?.baselineFrom &&
            memoizedContextValues.indexInsight?.trace_id_field
          )
        }
        onExclude={handleLogSequenceExclude}
      />
    </EuiPanel>
  );
};
