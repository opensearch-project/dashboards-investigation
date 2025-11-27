/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useContext } from 'react';
import moment from 'moment';
import { combineLatest, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { NotebookState } from 'common/state/notebook_state';
import { NoteBookServices } from 'public/types';
import {
  HypothesisItem,
  IndexInsightContent,
  NotebookContext,
  NoteBookSource,
  ParagraphBackendType,
} from '../../common/types/notebooks';
import { ParagraphState, ParagraphStateValue } from '../../common/state/paragraph_state';
import {
  DATA_DISTRIBUTION_PARAGRAPH_TYPE,
  dateFormat,
  LOG_PATTERN_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../../common/constants/notebooks';
import { getInputType } from '../../common/utils/paragraph';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { formatTimeRangeString } from '../../public/utils/time';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';

const savePrecheckParagraph = ({
  state,
  batchSaveParagraphs,
}: {
  state: NotebookState;
  batchSaveParagraphs: (props: {
    paragraphStateValues: Array<ParagraphStateValue<string, unknown, {}>>;
  }) => Promise<any>;
}) => {
  const dataDistributionState = state.value.paragraphs.find(
    (p) => p.value.input.inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE
  );
  const logPatternState = state.value.paragraphs.find(
    (p) => p.value.input.inputType === LOG_PATTERN_PARAGRAPH_TYPE
  );

  if (!dataDistributionState && !logPatternState) return;

  const dataDistributionObs = dataDistributionState ? dataDistributionState.getValue$() : of(null);
  const logPatternObs = logPatternState ? logPatternState.getValue$() : of(null);

  combineLatest([dataDistributionObs, logPatternObs])
    .pipe(
      filter(([dataDistribution, logPattern]) => {
        // Check if data distribution is ready
        let dataDistributionReady = true;
        if (dataDistribution) {
          const output = ParagraphState.getOutput(dataDistribution);
          const result = output?.result;
          const fieldComparison = (result as any)?.fieldComparison;
          dataDistributionReady = fieldComparison && fieldComparison.length > 0;
        }

        // Check if log pattern is ready
        let logPatternReady = true;
        if (logPattern) {
          const output = ParagraphState.getOutput(logPattern);
          logPatternReady = !!output?.result;
        }

        return dataDistributionReady && logPatternReady;
      }),
      take(1)
    )
    .subscribe(() => {
      const paragraphsToSaveBatch = [];
      if (dataDistributionState) paragraphsToSaveBatch.push(dataDistributionState.value);
      if (logPatternState) paragraphsToSaveBatch.push(logPatternState.value);

      batchSaveParagraphs({
        paragraphStateValues: paragraphsToSaveBatch as any,
      }).catch((err) => console.error('Error saving paragraphs: ', err));
    });
};

export const usePrecheck = () => {
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { state, paragraphHooks } = useContext(NotebookReactContext);
  const { batchCreateParagraphs, batchSaveParagraphs, runParagraph } = paragraphHooks;

  return {
    start: useCallback(
      async (res: {
        context?: NotebookContext;
        paragraphs: Array<ParagraphBackendType<unknown>>;
        doInvestigate: (props: {
          investigationQuestion: string;
          timeRange: { from: string; to: string };
        }) => Promise<unknown>;
        hypotheses?: HypothesisItem[];
      }) => {
        let logPatternParaExists = false;
        let anomalyAnalysisParaExists = false;

        for (let index = 0; index < res.paragraphs.length; ++index) {
          // if the paragraph is a query, load the query output
          if (res.paragraphs[index].input.inputType === LOG_PATTERN_PARAGRAPH_TYPE) {
            logPatternParaExists = true;
          } else if (res.paragraphs[index].input.inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE) {
            anomalyAnalysisParaExists = true;
          }
        }

        const totalParagraphLength = res.paragraphs.length;
        const paragraphsToCreate: Array<{
          input: ParagraphBackendType<unknown>['input'];
          dataSourceMDSId?: string;
        }> = [];

        // Collect log pattern paragraph
        if (!logPatternParaExists) {
          const resContext = res.context as NotebookContext;
          if (resContext?.timeRange && resContext?.index && resContext?.timeField) {
            if (
              resContext?.indexInsight?.is_log_index &&
              resContext?.indexInsight?.log_message_field
            ) {
              paragraphsToCreate.push({
                input: {
                  inputText: '',
                  inputType: LOG_PATTERN_PARAGRAPH_TYPE,
                  parameters: {
                    index: resContext.index,
                  },
                },
                dataSourceMDSId: resContext?.dataSourceId,
              });
            } else {
              const relatedLogIndex = resContext?.indexInsight?.related_indexes?.find(
                (relatedIndex: IndexInsightContent) => {
                  return relatedIndex.is_log_index && relatedIndex.log_message_field;
                }
              );

              if (relatedLogIndex) {
                paragraphsToCreate.push({
                  input: {
                    inputText: '',
                    inputType: LOG_PATTERN_PARAGRAPH_TYPE,
                    parameters: {
                      timeField: relatedLogIndex.time_field || resContext.timeField,
                      index: relatedLogIndex.index_name,
                      insight: relatedLogIndex,
                    },
                  },
                  dataSourceMDSId: resContext?.dataSourceId,
                });
              }
            }
          }
        }

        // Collect anomaly analysis paragraph
        if (!anomalyAnalysisParaExists) {
          const resContext = res.context;
          const canAnalyticDis =
            resContext?.source === NoteBookSource.DISCOVER &&
            resContext.variables?.['pplQuery'] &&
            !resContext.variables?.log;

          if (
            resContext?.timeRange &&
            resContext?.index &&
            resContext?.timeField &&
            canAnalyticDis
          ) {
            const newParaContent = JSON.stringify({
              index: resContext.index,
              timeField: resContext.timeField,
              dataSourceId: resContext?.dataSourceId,
              timeRange: resContext.timeRange,
              query: resContext.variables?.['pplQuery'],
            });
            paragraphsToCreate.push({
              input: {
                inputText: newParaContent || '',
                inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
              },
              dataSourceMDSId: resContext?.dataSourceId,
            });
          }
        }

        // Collect PPL paragraph
        if (
          res.context?.source === NoteBookSource.DISCOVER &&
          !res.paragraphs.find((paragraph) => getInputType(paragraph) === PPL_PARAGRAPH_TYPE) &&
          res.context.variables?.['pplQuery'] &&
          res.context.timeField &&
          res.context.timeRange
        ) {
          const formatToLocalTime = (timestamp: number) => moment(timestamp).format(dateFormat);
          const pplQuery = res.context.variables?.['pplQuery'];
          paragraphsToCreate.push({
            input: {
              inputText: `%ppl ${pplQuery}`,
              inputType: 'CODE',
              parameters: {
                noDatePicker: false,
                indexName: res.context.index,
                timeField: res.context.timeField,
                timeRange: {
                  from: formatToLocalTime(res.context.timeRange.selectionFrom),
                  to: formatToLocalTime(res.context.timeRange.selectionTo),
                },
              },
            },
            dataSourceMDSId: res.context.dataSourceId || '',
          });
        }

        if (paragraphsToCreate.length > 0) {
          try {
            // Create all paragraphs in batch
            await batchCreateParagraphs({
              startIndex: totalParagraphLength,
              paragraphs: paragraphsToCreate,
            });
            savePrecheckParagraph({ state, batchSaveParagraphs });
          } catch (e) {
            console.error('Error creating paragraphs in batch:', e);
          }
        }

        if (res.context?.initialGoal && !res.hypotheses?.length) {
          res.doInvestigate({
            investigationQuestion: res.context?.initialGoal || '',
            timeRange: formatTimeRangeString(res.context?.timeRange),
          });
        }
      },
      [batchCreateParagraphs, batchSaveParagraphs, state]
    ),
    rerun: useCallback(
      async (
        paragraphStates: Array<ParagraphState<unknown>>,
        timeRange: {
          from: string;
          to: string;
        }
      ) => {
        const paragraphIdsToSave: string[] = [];

        const pplParagraph = paragraphStates.find((paragraphState) =>
          paragraphState.value.input.inputText.startsWith('%ppl')
        );
        if (pplParagraph) {
          pplParagraph?.updateInput({
            ...pplParagraph.value.input,
            parameters: {
              ...(pplParagraph.value.input.parameters as any),
              timeRange: {
                from: moment.utc(timeRange.from).local().format(dateFormat),
                to: moment.utc(timeRange.to).local().format(dateFormat),
              },
            },
          });
          await runParagraph({ id: pplParagraph.value.id });
        }

        // TODO: when support baseline time for log pattern and log sequence
        // const logPatternParagraph = paragraphStates.find(
        //   (paragraphState) => paragraphState.value.input.inputType === LOG_PATTERN_PARAGRAPH_TYPE
        // );
        // if (logPatternParagraph) {
        //   paragraphIdsToSave.push(logPatternParagraph.value.id);
        // }

        const dataDistributionParagraph = paragraphStates.find(
          (paragraphState) =>
            paragraphState.value.input.inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE
        );
        if (dataDistributionParagraph) {
          await paragraphService
            .getParagraphRegistry(DATA_DISTRIBUTION_PARAGRAPH_TYPE)
            ?.runParagraph({
              paragraphState: dataDistributionParagraph,
              notebookStateValue: state.value,
            });
          paragraphIdsToSave.push(dataDistributionParagraph.value.id);
        }

        if (paragraphIdsToSave.length > 0) {
          try {
            await batchSaveParagraphs({
              paragraphStateValues: paragraphIdsToSave
                .map((id) => {
                  const paragraphState = paragraphStates.find((p) => p.value.id === id);
                  return paragraphState?.getBackendValue();
                })
                .filter(Boolean) as any[],
            });
          } catch (e) {
            console.error('Error running paragraphs in batch:', e);
          }
        }
      },
      [state.value, paragraphService, runParagraph, batchSaveParagraphs]
    ),
  };
};
