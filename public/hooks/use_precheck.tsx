/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef } from 'react';
import { combineLatest } from 'rxjs';
import {
  NotebookContext,
  NoteBookSource,
  ParagraphBackendType,
} from '../../common/types/notebooks';
import { ParagraphState, ParagraphStateValue } from '../../common/state/paragraph_state';
import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../../common/constants/notebooks';
import { useParagraphs } from './use_paragraphs';
import { useNotebook } from './use_notebook';
import { getInputType } from '../../common/utils/paragraph';

export const usePrecheck = () => {
  const { updateNotebookContext } = useNotebook();
  const { createParagraph, runParagraph } = useParagraphs();
  const deepResearchParaCreated = useRef(false);

  const setInitialGoal = useCallback(
    async (res: { context?: NotebookContext }) => {
      if (res.context?.source === NoteBookSource.ALERTING && !res.context.initialGoal) {
        await updateNotebookContext({
          initialGoal: 'Why did the alert happen? Find the root cause and give some solutions.',
        });
      }
    },
    [updateNotebookContext]
  );

  return {
    start: useCallback(
      async (res: {
        context?: NotebookContext;
        paragraphs: Array<ParagraphBackendType<unknown>>;
      }) => {
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

        if (!logPatternParaExists) {
          const resContext = res.context as NotebookContext;
          if (resContext?.timeRange && resContext?.index && resContext?.timeField) {
            if (
              resContext?.indexInsight?.is_log_index &&
              resContext?.indexInsight?.log_message_field
            ) {
              const logPatternResult = await createParagraph({
                index: totalParagraphLength + paragraphStates.length,
                input: {
                  inputText: '',
                  inputType: LOG_PATTERN_PARAGRAPH_TYPE,
                },
                dataSourceMDSId: resContext?.dataSourceId,
              });
              if (logPatternResult) {
                paragraphStates.push(logPatternResult);
              }
            }
          }
        }

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
            const anomalyAnalysisParagraphResult = await createParagraph({
              index: totalParagraphLength + paragraphStates.length,
              input: {
                inputText: newParaContent || '',
                inputType: ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
              },
              dataSourceMDSId: resContext?.dataSourceId,
            });
            if (anomalyAnalysisParagraphResult) {
              paragraphStates.push(anomalyAnalysisParagraphResult);
            }
          }
        }

        if (paragraphStates.length && res.context?.initialGoal) {
          const combinedObservable = combineLatest(
            paragraphStates.map((paragraphState) => paragraphState.getValue$())
          );
          const subscription = combinedObservable.subscribe(async (paragraphValues) => {
            const anomalyAnalysisPara = paragraphValues.find(
              (p) => p.input?.inputType === ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE
            );
            const logPatternPara = paragraphValues.find(
              (p) => p.input?.inputType === LOG_PATTERN_PARAGRAPH_TYPE
            );

            const hasResult = (para?: ParagraphStateValue<unknown>) =>
              !para?.uiState?.isRunning &&
              para?.output?.[0]?.result &&
              para.output[0].result !== '';
            const hasAnomalyResult = hasResult(anomalyAnalysisPara);
            const hasLogPatternResult = hasResult(logPatternPara);

            const shouldCreate =
              !deepResearchParaCreated.current &&
              ((anomalyAnalysisPara && logPatternPara && hasAnomalyResult && hasLogPatternResult) ||
                (anomalyAnalysisPara && !logPatternPara && hasAnomalyResult) ||
                (!anomalyAnalysisPara && logPatternPara && hasLogPatternResult));

            if (shouldCreate) {
              deepResearchParaCreated.current = true;

              subscription.unsubscribe();
              await createParagraph({
                index: totalParagraphLength + paragraphStates.length,
                input: {
                  inputText: '',
                  inputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
                },
                dataSourceMDSId: res.context?.dataSourceId,
              });
            }
          });
        }

        if (
          res.context?.source === NoteBookSource.DISCOVER &&
          !res.paragraphs.find((paragraph) => getInputType(paragraph) === PPL_PARAGRAPH_TYPE) &&
          res.context.variables?.pplQuery
        ) {
          const createdPPLParagraph = await createParagraph({
            index: res.paragraphs.length + paragraphStates.length,
            input: {
              inputText: `%ppl ${res.context.variables?.pplQuery}`,
              inputType: 'CODE',
              parameters: {
                noDatePicker: true,
              },
            },
            dataSourceMDSId: res.context.dataSourceId,
          });
          if (createdPPLParagraph) {
            runParagraph({
              id: createdPPLParagraph.value.id,
            });
          }
        }
      },
      [createParagraph, runParagraph]
    ),
    setInitialGoal,
  };
};
