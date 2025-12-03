/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect, useCallback, useRef, useState } from 'react';
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
import { useLogPatternAnalysis } from './hooks/useLogPatternAnalysis';
import { useContextProcessor } from './hooks/useContextProcessor';

interface LogPatternContainerProps {
  paragraphState: ParagraphState<
    LogPatternAnalysisResult,
    { index: string; timeField: string; insight: IndexInsightContent }
  >;
}

export const LogPatternContainer: React.FC<LogPatternContainerProps> = ({ paragraphState }) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const notebookReactContext = useContext(NotebookReactContext);
  const { saveParagraph } = notebookReactContext.paragraphHooks;

  // each time will get a new paragraph object reference
  const paragraph = useObservable(paragraphState.getValue$());
  const notebookState = useObservable(notebookReactContext.state.getValue$());
  const context = notebookState?.context.value;

  const paragraphRef = useRef(paragraph);
  useEffect(() => {
    paragraphRef.current = paragraph;
  }, [paragraph]);

  const processedContext = useContextProcessor(context, JSON.stringify(paragraph?.input));

  const existingResult = paragraph?.output?.[0]?.result
    ? JSON.stringify(paragraph.output[0].result)
    : undefined;

  const onSaveOutput = useCallback(
    (result: LogPatternAnalysisResult) => {
      if (paragraphRef.current) {
        paragraphState.updateOutput({ result });
      }
    },
    [paragraphState]
  );

  const { result, loadingStatus, error, handleExclude } = useLogPatternAnalysis(
    http,
    processedContext,
    onSaveOutput,
    existingResult
  );

  const toggleChange = useCallback((changeId: string) => {
    setResultChanged(true);
    setChanges((prev: string[]) =>
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

  const [changes, setChanges] = useState<string[]>([]);
  const [resultChanged, setResultChanged] = useState<boolean>();

  // Save results when needed
  useEffect(() => {
    if (paragraphRef.current && resultChanged) {
      (async () => {
        await saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraphRef.current!, result),
        });
        setResultChanged(false);
      })();
    }
  }, [result, resultChanged, saveParagraph]);

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
              values: { index: processedContext?.index },
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
        isLoadingLogInsights={loadingStatus.isLoadingLogInsights}
        disableExclude={!!resultChanged}
        onExclude={handleLogInsightExclude}
      />
      <EuiSpacer size="s" />

      <PatternDifference
        patternMapDifference={result?.patternMapDifference || []}
        isLoadingPatternMapDifference={loadingStatus.isLoadingPatternMapDifference}
        isNotApplicable={!processedContext?.timeRange?.baselineFrom}
        disableExclude={!!resultChanged}
        onExclude={handlePatternDifferenceExclude}
      />
      <EuiSpacer size="s" />

      <LogSequence
        exceptionalSequences={result?.EXCEPTIONAL || []}
        isLoadingLogSequence={loadingStatus.isLoadingLogSequence}
        isNotApplicable={
          !(
            processedContext?.timeRange?.baselineFrom &&
            processedContext.indexInsight?.trace_id_field
          )
        }
        disableExclude={!!resultChanged}
        onExclude={handleLogSequenceExclude}
      />
    </EuiPanel>
  );
};
