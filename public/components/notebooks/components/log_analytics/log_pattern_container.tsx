/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCallOut, EuiTitle } from '@elastic/eui';
import { useObservable } from 'react-use';
import { LogPattern, LogPatternAnalysisResult, LogSequenceEntry } from 'common/types/log_pattern';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { LogInsight } from './components/log_insight';
import { PatternDifference } from './components/pattern_difference';
import { LogSequence } from './components/log_sequence';
import { SummaryStatistics } from './components/summary_statistics';
import { IndexInsightContent } from '../../../../../common/types/notebooks';
import { LOG_PATTERN_PARAGRAPH_TYPE } from '../../../../../common/constants/notebooks';

interface LogPatternContainerProps {
  paragraphState: ParagraphState<
    LogPatternAnalysisResult,
    { index: string; timeField: string; insight: IndexInsightContent }
  >;
}

export const LogPatternContainer: React.FC<LogPatternContainerProps> = ({ paragraphState }) => {
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const notebookReactContext = useContext(NotebookReactContext);
  const { saveParagraph } = notebookReactContext.paragraphHooks;

  const paragraph = useObservable(paragraphState.getValue$());
  const notebookState = useObservable(notebookReactContext.state.getValue$());
  const context = notebookState?.context.value;

  const paragraphRegistry = paragraphService?.getParagraphRegistry(LOG_PATTERN_PARAGRAPH_TYPE);
  const { result } = ParagraphState.getOutput(paragraph) || {};
  const { isLoadingLogInsights, isLoadingPatternMapDifference, isLoadingLogSequence, error } =
    paragraph?.uiState?.logPattern || {};

  const isLoading = isLoadingLogInsights || isLoadingPatternMapDifference || isLoadingLogSequence;

  // Run paragraph if no result exists
  useEffect(() => {
    if (error || result || isLoading || !paragraph || paragraph.uiState?.isRunning) {
      return;
    }
    paragraphRegistry?.runParagraph({
      paragraphState,
      notebookStateValue: notebookReactContext.state.value,
    });
  }, [
    paragraphRegistry,
    result,
    isLoading,
    paragraph,
    error,
    paragraphState,
    notebookReactContext.state.value,
  ]);

  const handleExclude = useCallback(
    (
      item: LogPattern | LogSequenceEntry,
      type: 'logInsights' | 'patternMapDifference' | 'logSequence'
    ) => {
      if (!result) return;
      const newResult = { ...result };
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
      paragraphState.updateOutput({ result: newResult });
      pendingSaveRef.current = newResult;
      setResultChanged(true);
    },
    [result, paragraphState]
  );

  const [changes, setChanges] = useState<string[]>([]);
  const [resultChanged, setResultChanged] = useState(false);
  const pendingSaveRef = useRef<LogPatternAnalysisResult | null>(null);

  const toggleChange = useCallback((changeId: string) => {
    setChanges((prev) =>
      prev.includes(changeId) ? prev.filter((name) => name !== changeId) : [...prev, changeId]
    );
  }, []);

  const handleLogInsightExclude = useCallback(
    (item: LogPattern) => {
      handleExclude(item, 'logInsights');
      toggleChange(`logInsights-${item.pattern}`);
    },
    [handleExclude, toggleChange]
  );

  const handlePatternDifferenceExclude = useCallback(
    (item: LogPattern) => {
      handleExclude(item, 'patternMapDifference');
      toggleChange(`patternMapDifference-${item.pattern}`);
    },
    [handleExclude, toggleChange]
  );

  const handleLogSequenceExclude = useCallback(
    (item: LogSequenceEntry) => {
      handleExclude(item, 'logSequence');
      toggleChange(`logSequence-${item.traceId}`);
    },
    [handleExclude, toggleChange]
  );

  // Save results when exclusions change
  useEffect(() => {
    if (paragraph && resultChanged && pendingSaveRef.current) {
      const resultToSave = pendingSaveRef.current;
      pendingSaveRef.current = null;
      setResultChanged(false);
      saveParagraph({
        paragraphStateValue: ParagraphState.updateOutputResult(paragraph, resultToSave),
      });
    }
  }, [paragraph, resultChanged, saveParagraph]);

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
              values: { index: context?.index },
            })}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />

      <SummaryStatistics result={result} />
      <EuiSpacer size="s" />

      {changes.length > 0 && (
        <EuiCallOut color="warning" iconType="info">
          <EuiText>
            {i18n.translate('notebook.log.sequence.paragraph.notice', {
              defaultMessage:
                'Log analysis result is part of context of AI investigation, exclude some not useful items and re-run the AI investigation to see the more accurate investigation result based on your valuable feedback.',
            })}
          </EuiText>
        </EuiCallOut>
      )}
      <EuiSpacer size="s" />

      <LogInsight
        logInsights={result?.logInsights || []}
        isLoadingLogInsights={!!isLoadingLogInsights}
        disableExclude={resultChanged}
        onExclude={handleLogInsightExclude}
      />
      <EuiSpacer size="s" />

      <PatternDifference
        patternMapDifference={result?.patternMapDifference || []}
        isLoadingPatternMapDifference={!!isLoadingPatternMapDifference}
        isNotApplicable={!context?.timeRange?.baselineFrom}
        disableExclude={resultChanged}
        onExclude={handlePatternDifferenceExclude}
      />
      <EuiSpacer size="s" />

      <LogSequence
        exceptionalSequences={result?.EXCEPTIONAL || []}
        isLoadingLogSequence={!!isLoadingLogSequence}
        isNotApplicable={
          !(context?.timeRange?.baselineFrom && context?.indexInsight?.trace_id_field)
        }
        disableExclude={resultChanged}
        onExclude={handleLogSequenceExclude}
      />
    </EuiPanel>
  );
};
