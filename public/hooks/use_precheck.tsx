/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookContext, ParagraphBackendType } from 'common/types/notebooks';
import { useCallback } from 'react';
import { combineLatest } from 'rxjs';
import { ParagraphState } from 'common/state/paragraph_state';
import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
} from '../../common/constants/notebooks';
import { useParagraphs } from './use_paragraphs';

export const usePrecheck = () => {
  const { createParagraph } = useParagraphs();

  return {
    start: useCallback(
      async (res: { context?: NotebookContext; paragraphs: ParagraphBackendType[] }) => {
        let logPatternParaExists = false;
        let anomalyAnalysisParaExists = false;

        for (let index = 0; index < res.paragraphs.length; ++index) {
          // if the paragraph is a query, load the query output
          if (res.paragraphs[index].input.inputType === LOG_PATTERN_PARAGRAPH_TYPE) {
            logPatternParaExists = true;
          } else if (
            res.paragraphs[index].input.inputType === ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE
          ) {
            anomalyAnalysisParaExists = true;
          }
        }

        const totalParagraphLength = res.paragraphs.length;
        const paragraphStates: Array<ParagraphState<unknown>> = [];

        if (!anomalyAnalysisParaExists) {
          const resContext = res.context;
          if (
            resContext?.filters &&
            resContext?.timeRange &&
            resContext?.index &&
            resContext?.timeField
          ) {
            const newParaContent = JSON.stringify({
              index: resContext.index,
              timeField: resContext.timeField,
              dataSourceId: resContext?.dataSourceId,
              timeRange: resContext.timeRange,
              filters: resContext.filters,
            });
            const anomalyAnalysisParagraphResult = await createParagraph(
              totalParagraphLength,
              newParaContent || '',
              ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE
            );
            if (anomalyAnalysisParagraphResult) {
              paragraphStates.push(anomalyAnalysisParagraphResult);
            }
          }
        }
        if (!logPatternParaExists) {
          const resContext = res.context as NotebookContext;
          if (resContext?.timeRange && resContext?.index && resContext?.timeField) {
            if (
              resContext?.indexInsight?.is_log_index &&
              resContext?.indexInsight?.log_message_field
            ) {
              const logPatternResult = await createParagraph(
                totalParagraphLength + 1,
                '',
                LOG_PATTERN_PARAGRAPH_TYPE
              );
              if (logPatternResult) {
                paragraphStates.push(logPatternResult);
              }
            }
          }
        }

        if (paragraphStates.length) {
          const combinedObservable = combineLatest(
            paragraphStates.map((paragraphState) => paragraphState.getValue$())
          );
          combinedObservable.subscribe(() => {
            // TODO insert PER agent if all output get populated and unsubscribe
            // subscription.unsubscribe();
          });
        }
      },
      [createParagraph]
    ),
  };
};
