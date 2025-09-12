/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { LogPatternAnalysisResult } from '../../common/types/log_pattern';
import { LogPatternAnalysisParams, LogPatternService } from '../services/requests/log_pattern';
import { parsePPLQuery } from '../../common/utils';
import { DataDistributionDataService } from '../components/notebooks/components/data_distribution/data_distribution_data_service';
import { dateFormat } from '../../common/constants/notebooks';
import { HttpSetup } from '../../../../src/core/public';

const LOG_INSIGHTS_ANALYSIS = 'Log Insights Analysis';
const PATTERN_DIFFERENCE_ANALYSIS = 'Pattern Difference Analysis';
const LOG_SEQUENCE_ANALYSIS = 'Log Sequence Analysis';

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

interface TimeRange {
  selectionFrom: number;
  selectionTo: number;
  baselineFrom?: number;
  baselineTo?: number;
}

interface UseLogPatternProps {
  dataSourceId: string;
  index: string;
  timeField: string;
  timeRange: TimeRange;
  logMessageField?: string;
  traceIdField?: string;
  pplQuery?: string;
  http: HttpSetup;
  cachedResult?: LogPatternAnalysisResult;
  skipAutoFetch?: boolean;
}

interface UseLogPatternResult {
  result: LogPatternAnalysisResult;
  loadingStatus: LoadingStatus;
  error: string | null;
  hasData: boolean;
  analyzeLogPatterns: () => Promise<void>;
}

export const useLogPattern = ({
  dataSourceId,
  index,
  timeField,
  timeRange,
  logMessageField,
  traceIdField,
  pplQuery,
  http,
  cachedResult,
  skipAutoFetch = false,
}: UseLogPatternProps): UseLogPatternResult => {
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
  const [result, setResult] = useState<LogPatternAnalysisResult>(
    cachedResult || {
      logInsights: [],
      patternMapDifference: [],
      EXCEPTIONAL: {},
      BASE: {},
    }
  );
  const [hasData, setHasData] = useState<boolean>(!!cachedResult);

  const dataService = useMemo(() => new DataDistributionDataService(), []);
  const logPatternService = useMemo(() => new LogPatternService(http), [http]);

  // Process merged time range from PPL query and time picker
  const processedTimeRange = useMemo(() => {
    if (!pplQuery) {
      return timeRange;
    }

    const mergedTimeRange = { ...timeRange };
    try {
      const conditions = parsePPLQuery(pplQuery).compareExprs;
      // time field with expressions like date_sub(time, interval 1 hour) are not supported
      const isTimeFieldCondition = (filed: string) =>
        filed === timeField || filed === `\`${timeField}\``;
      const timeConditions =
        conditions?.filter(
          (con) => isTimeFieldCondition(con.left) || isTimeFieldCondition(con.right)
        ) || [];

      for (const con of timeConditions) {
        const timeFiledOnLeft = isTimeFieldCondition(con.left);
        const timeValue = timeFiledOnLeft ? con.right : con.left;
        // the time value could be expression like `date_sub(now(), interval 1 hour)`
        const pplToEval = `source=${index} | head 1 | eval timeValue = ${timeValue} | fields timeValue`;
        dataService.setConfig(dataSourceId, index, timeField);

        // This is a synchronous approach to avoid complicating the hook
        // In a real-world scenario, you might want to handle this asynchronously
        dataService
          .fetchPPlData(pplToEval)
          .then((data) => {
            if (data && data.length > 0) {
              const time = moment.utc(data[0].timeValue).valueOf();
              // merge
              if (timeFiledOnLeft) {
                if (con.op === '<' || con.op === '<=') {
                  mergedTimeRange.selectionTo =
                    mergedTimeRange.selectionTo !== undefined
                      ? Math.min(time, mergedTimeRange.selectionTo)
                      : time;
                } else {
                  mergedTimeRange.selectionFrom =
                    mergedTimeRange.selectionFrom !== undefined
                      ? Math.max(time, mergedTimeRange.selectionFrom)
                      : time;
                }
              } else {
                if (con.op === '>' || con.op === '>=') {
                  mergedTimeRange.selectionTo =
                    mergedTimeRange.selectionTo !== undefined
                      ? Math.min(time, mergedTimeRange.selectionTo)
                      : time;
                } else {
                  mergedTimeRange.selectionFrom =
                    mergedTimeRange.selectionFrom !== undefined
                      ? Math.max(time, mergedTimeRange.selectionFrom)
                      : time;
                }
              }
            }
          })
          .catch((err) => {
            console.error('Failed to fetch PPL data:', err);
          });
      }
    } catch (err) {
      console.error('Failed to parse PPL query:', err);
    }

    return mergedTimeRange;
  }, [timeRange, pplQuery, index, timeField, dataSourceId, dataService]);

  // Function to analyze log patterns
  const analyzeLogPatterns = useCallback(async (): Promise<void> => {
    // If we have a cached result and aren't force reloading, just use that
    if (cachedResult && !loadingStatus.isLoading) {
      setResult(cachedResult);
      setHasData(true);
      return;
    }

    // Validate required parameters
    if (!processedTimeRange.selectionFrom || !processedTimeRange.selectionTo) {
      setError('No valid time range available for log pattern analysis');
      return;
    }

    const apiRequestsParam: LogPatternAnalysisParams = {
      selectionStartTime: moment(processedTimeRange.selectionFrom).toISOString(),
      selectionEndTime: moment(processedTimeRange.selectionTo).toISOString(),
      timeField,
      logMessageField,
      indexName: index,
      dataSourceMDSId: dataSourceId,
    };

    // Define all API requests
    const apiRequests = [
      {
        name: LOG_INSIGHTS_ANALYSIS,
        params: apiRequestsParam,
        resultKey: 'logInsights' as keyof LogPatternAnalysisResult,
      },
    ];

    if (processedTimeRange.baselineFrom && processedTimeRange.baselineTo) {
      apiRequests.push({
        name: PATTERN_DIFFERENCE_ANALYSIS,
        params: {
          baselineStartTime: moment(processedTimeRange.baselineFrom).utc().format(dateFormat),
          baselineEndTime: moment(processedTimeRange.baselineTo).utc().format(dateFormat),
          ...apiRequestsParam,
        },
        resultKey: 'patternMapDifference' as keyof LogPatternAnalysisResult,
      });
    }

    if (processedTimeRange.baselineFrom && processedTimeRange.baselineTo && traceIdField) {
      apiRequests.push({
        name: LOG_SEQUENCE_ANALYSIS,
        params: {
          baselineStartTime: moment(processedTimeRange.baselineFrom).utc().format(dateFormat),
          baselineEndTime: moment(processedTimeRange.baselineTo).utc().format(dateFormat),
          traceIdField,
          ...apiRequestsParam,
        },
        resultKey: 'EXCEPTIONAL' as keyof LogPatternAnalysisResult,
      });
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
  }, [
    processedTimeRange,
    dataSourceId,
    index,
    timeField,
    logMessageField,
    traceIdField,
    logPatternService,
    cachedResult,
    loadingStatus.isLoading,
  ]);

  // Auto fetch data when parameters change, unless skipAutoFetch is true
  useEffect(() => {
    if (!skipAutoFetch) {
      analyzeLogPatterns();
    }
  }, [
    processedTimeRange,
    dataSourceId,
    index,
    timeField,
    logMessageField,
    traceIdField,
    skipAutoFetch,
    analyzeLogPatterns,
  ]);

  return {
    result,
    loadingStatus,
    error,
    hasData,
    analyzeLogPatterns,
  };
};
