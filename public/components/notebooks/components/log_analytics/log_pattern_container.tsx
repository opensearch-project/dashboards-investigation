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
import { useParagraphs } from '../../../../hooks/use_paragraphs';
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
  const { saveParagraph } = useParagraphs();
  const notebookReactContext = useContext(NotebookReactContext);

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
        saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraphRef.current, result),
        });
      }
    },
    [saveParagraph]
  );

  const { result, loadingStatus, error, handleExclude } = useLogPatternAnalysis(
    http,
    onSaveOutput,
    processedContext,
    existingResult
  );

  const handleLogInsightExclude = useCallback(
    (item: LogPattern) => {
      handleExclude(item, 'logInsights');
      setChanges((prev: string[]) => {
        const change = `logInsights-${item.pattern}`;
        if (prev.includes(change)) {
          // remove it and return
          return prev.filter((name) => name !== change);
        } else {
          // add it and return
          return [...prev, change];
        }
      });
    },
    [handleExclude]
  );

  const handlePatternDifferenceExclude = useCallback(
    (item: LogPattern) => {
      handleExclude(item, 'patternMapDifference');
      setChanges((prev: string[]) => {
        const change = `patternMapDifference-${item.pattern}`;
        if (prev.includes(change)) {
          // remove it and return
          return prev.filter((name) => name !== change);
        } else {
          // add it and return
          return [...prev, change];
        }
      });
    },
    [handleExclude]
  );

  const handleLogSequenceExclude = useCallback(
    (item: LogSequenceEntry) => {
      handleExclude(item, 'logSequence');
      setChanges((prev: string[]) => {
        const change = `logSequence-${item.traceId}`;
        if (prev.includes(change)) {
          return prev.filter((name) => name !== change);
        } else {
          return [...prev, change];
        }
      });
    },
    [handleExclude]
  );

  const [changes, setChanges] = useState<string[]>([]);

  // // Save results when needed
  // useEffect(() => {
  //   if (changes.length > 0 && paragraphRef.current) {
  //     saveParagraph({
  //       paragraphStateValue: ParagraphState.updateOutputResult(paragraphRef.current, result),
  //     });
  //   }
  // }, [result, changes, saveParagraph]);

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
        <EuiCallOut color="primary" iconType="info">
          <EuiText>
            {i18n.translate('notebook.log.sequence.paragraph.notice', {
              defaultMessage:
                'Note that excluding items will take effect once you re-run the investigation',
            })}
          </EuiText>
        </EuiCallOut>
      )}
      <EuiSpacer size="s" />

      <LogInsight
        logInsights={result?.logInsights || []}
        isLoadingLogInsights={loadingStatus.isLoadingLogInsights}
        onExclude={handleLogInsightExclude}
      />
      <EuiSpacer size="s" />

      <PatternDifference
        patternMapDifference={result?.patternMapDifference || []}
        isLoadingPatternMapDifference={loadingStatus.isLoadingPatternMapDifference}
        isNotApplicable={!processedContext?.timeRange?.baselineFrom}
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
        onExclude={handleLogSequenceExclude}
      />
    </EuiPanel>
  );
};
