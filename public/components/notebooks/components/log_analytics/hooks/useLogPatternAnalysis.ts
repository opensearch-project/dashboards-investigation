/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment';
import {
  LogPatternAnalysisResult,
  LogPattern,
  LogSequenceEntry,
} from '../../../../../../common/types/log_pattern';
import {
  LogPatternAnalysisParams,
  LogPatternService,
} from '../../../../../services/requests/log_pattern';
import { NotebookContext } from '../../../../../../common/types/notebooks';
import { dateFormat } from '../../../../../../common/constants/notebooks';
import { sortPatternMapDifference } from '../components/pattern_difference';
import { HttpSetup } from '../../../../../../../../src/core/public';

const ANALYSIS_TYPES = {
  LOG_INSIGHTS: 'Log Insights Analysis',
  PATTERN_DIFFERENCE: 'Pattern Difference Analysis',
  LOG_SEQUENCE: 'Log Sequence Analysis',
} as const;

interface LoadingStatus {
  isLoadingLogInsights: boolean;
  isLoadingPatternMapDifference: boolean;
  isLoadingLogSequence: boolean;
}

export const useLogPatternAnalysis = (
  http: HttpSetup,
  analysisParameters: Partial<NotebookContext>,
  saveParaOutput?: (result: LogPatternAnalysisResult) => void,
  existingResult?: string
) => {
  const [result, setResult] = useState<LogPatternAnalysisResult>();
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoadingLogInsights: false,
    isLoadingPatternMapDifference: false,
    isLoadingLogSequence: false,
  });
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildApiRequests = useCallback(() => {
    if (!analysisParameters?.timeRange) return [];

    const { selectionFrom, selectionTo, baselineFrom, baselineTo } = analysisParameters.timeRange;

    const baseParams = {
      selectionStartTime: moment(selectionFrom).utc().format(dateFormat),
      selectionEndTime: moment(selectionTo).utc().format(dateFormat),
      timeField: analysisParameters.timeField,
      logMessageField: analysisParameters?.indexInsight?.log_message_field,
      indexName: analysisParameters.index,
      dataSourceMDSId: analysisParameters.dataSourceId,
    } as LogPatternAnalysisParams;

    const requests: Array<{
      name: typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];
      params: LogPatternAnalysisParams;
      resultKey: keyof LogPatternAnalysisResult;
    }> = [
      {
        name: ANALYSIS_TYPES.LOG_INSIGHTS,
        params: baseParams,
        resultKey: 'logInsights' as keyof LogPatternAnalysisResult,
      },
    ];

    if (baselineFrom && baselineTo) {
      requests.push({
        name: ANALYSIS_TYPES.PATTERN_DIFFERENCE,
        params: {
          ...baseParams,
          baselineStartTime: moment(baselineFrom).utc().format(dateFormat),
          baselineEndTime: moment(baselineTo).utc().format(dateFormat),
        },
        resultKey: 'patternMapDifference' as keyof LogPatternAnalysisResult,
      });

      if (analysisParameters?.indexInsight?.trace_id_field) {
        requests.push({
          name: ANALYSIS_TYPES.LOG_SEQUENCE,
          params: {
            ...baseParams,
            baselineStartTime: moment(baselineFrom).utc().format(dateFormat),
            baselineEndTime: moment(baselineTo).utc().format(dateFormat),
            traceIdField: analysisParameters.indexInsight.trace_id_field,
          },
          resultKey: 'EXCEPTIONAL' as keyof LogPatternAnalysisResult,
        });
      }
    }

    return requests;
  }, [analysisParameters]);

  const fetchAnalysis = useCallback(async () => {
    const requests = buildApiRequests();

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoadingStatus({
      isLoadingLogInsights: requests.some((r) => r.name === ANALYSIS_TYPES.LOG_INSIGHTS),
      isLoadingPatternMapDifference: requests.some(
        (r) => r.name === ANALYSIS_TYPES.PATTERN_DIFFERENCE
      ),
      isLoadingLogSequence: requests.some((r) => r.name === ANALYSIS_TYPES.LOG_SEQUENCE),
    });
    setError(null);

    const logPatternService = new LogPatternService(http);

    try {
      for (const request of requests) {
        const analysisResult = await logPatternService.analyzeLogPatterns(request.params);

        if (request.resultKey === 'logInsights' && analysisResult.logInsights) {
          setResult((prev) => ({
            ...prev,
            logInsights: analysisResult.logInsights,
          }));
          setLoadingStatus((prev) => ({
            ...prev,
            isLoadingLogInsights: false,
          }));
        } else if (
          request.resultKey === 'patternMapDifference' &&
          analysisResult.patternMapDifference
        ) {
          setResult((prev) => ({
            ...prev,
            patternMapDifference: sortPatternMapDifference(analysisResult.patternMapDifference),
          }));
          setLoadingStatus((prev) => ({
            ...prev,
            isLoadingPatternMapDifference: false,
          }));
        } else if (request.resultKey === 'EXCEPTIONAL' && analysisResult.EXCEPTIONAL) {
          setResult((prev) => ({
            ...prev,
            EXCEPTIONAL: analysisResult.EXCEPTIONAL,
          }));
          setLoadingStatus((prev) => ({
            ...prev,
            isLoadingLogSequence: false,
          }));
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis failed');
      }
    }
  }, [buildApiRequests, http]);

  const allRequestsComplete =
    !loadingStatus.isLoadingLogInsights &&
    !loadingStatus.isLoadingLogSequence &&
    !loadingStatus.isLoadingPatternMapDifference;

  useEffect(() => {
    if (existingResult && !result) {
      setResult(JSON.parse(existingResult));
    } else if (!existingResult && result && allRequestsComplete && saveParaOutput) {
      saveParaOutput(result);
    }
  }, [existingResult, result, saveParaOutput, allRequestsComplete]);

  useEffect(() => {
    if (!allRequestsComplete) {
      return;
    }
    if (!existingResult && !result) {
      fetchAnalysis();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [allRequestsComplete, existingResult, fetchAnalysis, result]);

  const handleExclude = useCallback(
    (
      item: LogPattern | LogSequenceEntry,
      type: 'logInsights' | 'patternMapDifference' | 'logSequence'
    ) => {
      setResult((prev) => {
        const newResult = { ...prev };

        if (type === 'logInsights') {
          newResult.logInsights = newResult.logInsights?.map((insight) =>
            insight.pattern === (item as LogPattern).pattern
              ? { ...insight, excluded: !insight.excluded }
              : insight
          );
        } else if (type === 'patternMapDifference') {
          newResult.patternMapDifference = newResult.patternMapDifference?.map((pattern) =>
            pattern.pattern === (item as LogPattern).pattern
              ? { ...pattern, excluded: !pattern.excluded }
              : pattern
          );
        } else if (type === 'logSequence') {
          newResult.EXCEPTIONAL = newResult.EXCEPTIONAL?.map((sequence) =>
            sequence.traceId === (item as LogSequenceEntry).traceId
              ? { ...sequence, excluded: !sequence.excluded }
              : sequence
          );
        }

        return newResult;
      });
    },
    []
  );

  return {
    result,
    loadingStatus,
    error,
    handleExclude,
  };
};
