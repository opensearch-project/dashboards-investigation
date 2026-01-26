/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useContext } from 'react';
import moment from 'moment';
import { combineLatest } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { NoteBookServices } from 'public/types';
import {
  AnomalyVisualizationAnalysisOutputResult,
  HypothesisItem,
  IndexInsightContent,
  InvestigationTimeRange,
  NotebookContext,
  NoteBookSource,
  ParagraphBackendType,
} from '../../common/types/notebooks';
import { VisualizationInputValue } from '../components/notebooks/components/input/visualization_input';
import { ParagraphState, ParagraphStateValue } from '../../common/state/paragraph_state';
import {
  DASHBOARDS_VISUALIZATION_TYPE,
  DATA_DISTRIBUTION_PARAGRAPH_TYPE,
  dateFormat,
  LOG_PATTERN_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../../common/constants/notebooks';
import { getInputType } from '../../common/utils/paragraph';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { isDateAppenddablePPL } from '../utils/query';
import { createDashboardVizObject } from '../utils/visualization';

export const waitForPrecheckContexts = ({
  paragraphStates,
  onReady,
}: {
  paragraphStates: Array<ParagraphState<unknown>>;
  onReady: (paragraphStates: Array<ParagraphState<unknown>>) => void;
}) => {
  if (paragraphStates.length === 0) {
    onReady([]);
    return;
  }

  const observables = paragraphStates.map((p) => p.getValue$());

  combineLatest(observables)
    .pipe(
      filter((values) => {
        return values.every((value) => {
          const inputType = value.input.inputType;

          if (inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE) {
            const hasError = value.uiState?.dataDistribution?.error;
            const output = ParagraphState.getOutput(value);
            const fieldComparison = (output?.result as AnomalyVisualizationAnalysisOutputResult)
              ?.fieldComparison;
            return !!hasError || fieldComparison;
          }

          if (inputType === LOG_PATTERN_PARAGRAPH_TYPE) {
            const output = ParagraphState.getOutput(value);
            const error = value.uiState?.logPattern?.error;
            return !!output?.result || !!error;
          }

          if (value.input.inputText?.startsWith('%ppl')) {
            return !!value.fullfilledOutput;
          }

          return true;
        });
      }),
      take(1)
    )
    .subscribe(() => onReady(paragraphStates));
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
          timeRange?: InvestigationTimeRange;
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
            [NoteBookSource.DISCOVER, NoteBookSource.VISUALIZATION, NoteBookSource.CHAT].includes(
              resContext?.source!
            ) &&
            resContext?.variables?.['pplQuery'] &&
            !resContext.variables?.log &&
            isDateAppenddablePPL(resContext.variables.pplQuery);

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
          (res.context?.source === NoteBookSource.DISCOVER ||
            res.context?.source === NoteBookSource.CHAT) &&
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
                noDatePicker: !isDateAppenddablePPL(pplQuery),
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

        // Collect visualization paragraph
        if (
          res.context?.source === NoteBookSource.VISUALIZATION &&
          !res.paragraphs.find(
            (paragraph) => getInputType(paragraph) === DASHBOARDS_VISUALIZATION_TYPE
          ) &&
          res.context.variables?.['savedObjectId'] &&
          res.context.timeRange
        ) {
          const formatToLocalTime = (timestamp: number) => moment(timestamp).format(dateFormat);
          const savedObjectId = res.context.variables.savedObjectId as string;
          const visualizationFilters = res.context.variables.visualizationFilters || [];

          // Create visualization input value with saved object ID and time range
          const vizInputValue = {
            type: 'explore', // Type for discover visualizations
            id: savedObjectId,
            startTime: formatToLocalTime(res.context.timeRange.selectionFrom),
            endTime: formatToLocalTime(res.context.timeRange.selectionTo),
          };

          // Create dashboard viz object and add filters
          const dashboardVizObject = createDashboardVizObject(vizInputValue);
          dashboardVizObject.filters = visualizationFilters as any[];

          paragraphsToCreate.push({
            input: {
              inputText: JSON.stringify(dashboardVizObject),
              inputType: DASHBOARDS_VISUALIZATION_TYPE,
              parameters: {
                ...vizInputValue,
                noDatePicker: true, // Flag to hide the date picker for precheck visualizations
                hideReloadButton: true, // Flag to hide the reload button for precheck visualizations
              },
            },
            dataSourceMDSId: res.context.dataSourceId || '',
          });
        }

        const shouldInvestigate = res.context?.initialGoal && !res.hypotheses?.length;
        if (paragraphsToCreate.length > 0 || shouldInvestigate) {
          if (paragraphsToCreate.length > 0) {
            try {
              await batchCreateParagraphs({
                startIndex: totalParagraphLength,
                paragraphs: paragraphsToCreate,
              });
            } catch (e) {
              console.error('Error creating paragraphs in batch:', e);
            }
          }

          const precheckParagraphs = state.value.paragraphs.filter((p) => {
            const { inputType, inputText } = p.value.input;
            return (
              inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE ||
              inputType === LOG_PATTERN_PARAGRAPH_TYPE ||
              inputText?.startsWith('%ppl') ||
              inputType === DASHBOARDS_VISUALIZATION_TYPE
            );
          });

          waitForPrecheckContexts({
            paragraphStates: precheckParagraphs,
            onReady: (paragraphStates) => {
              const paragraphsToSave = paragraphStates.filter(
                (p) => !p.value.input.inputText?.startsWith('%ppl')
              );
              if (paragraphsToSave.length > 0) {
                batchSaveParagraphs({
                  paragraphStateValues: paragraphsToSave.map((p) => p.value) as Array<
                    ParagraphStateValue<string>
                  >,
                }).catch((err) => console.error('Error saving paragraphs: ', err));
              }

              if (shouldInvestigate) {
                res.doInvestigate({
                  investigationQuestion: res.context?.initialGoal || '',
                  timeRange: res.context?.timeRange,
                });
              }
            },
          });
        }
      },
      [batchCreateParagraphs, batchSaveParagraphs, state]
    ),
    rerun: useCallback(
      async (
        paragraphStates: Array<ParagraphState<unknown>>,
        timeRange?: InvestigationTimeRange
      ) => {
        const paragraphIdsToSave: string[] = [];

        const pplParagraph = paragraphStates.find((paragraphState) =>
          paragraphState.value.input.inputText.startsWith('%ppl')
        );
        if (pplParagraph && timeRange) {
          pplParagraph?.updateInput({
            ...pplParagraph.value.input,
            parameters: {
              ...(pplParagraph.value.input.parameters as any),
              timeRange: {
                from: moment(timeRange.selectionFrom).format(dateFormat),
                to: moment(timeRange.selectionTo).format(dateFormat),
              },
            },
          });
          await runParagraph({ id: pplParagraph.value.id });
        }

        // Handle visualization paragraph time range updates
        const visualizationParagraph = paragraphStates.find(
          (paragraphState) => paragraphState.value.input.inputType === DASHBOARDS_VISUALIZATION_TYPE
        );
        if (visualizationParagraph && timeRange) {
          const formatToLocalTime = (timestamp: number) => moment(timestamp).format(dateFormat);
          const newStartTime = formatToLocalTime(timeRange.selectionFrom);
          const newEndTime = formatToLocalTime(timeRange.selectionTo);

          // Get current parameters as VisualizationInputValue
          const currentParams = visualizationParagraph.value.input
            .parameters as VisualizationInputValue;

          // Update the visualization paragraph with new time range
          const updatedParams: VisualizationInputValue = {
            ...currentParams,
            startTime: newStartTime,
            endTime: newEndTime,
          };

          // Update the dashboard viz object in inputText with new time range
          try {
            const dashboardVizObject = JSON.parse(visualizationParagraph.value.input.inputText);
            if (dashboardVizObject.timeRange) {
              dashboardVizObject.timeRange.from = newStartTime;
              dashboardVizObject.timeRange.to = newEndTime;
            }
            visualizationParagraph.updateInput({
              ...visualizationParagraph.value.input,
              parameters: updatedParams,
              inputText: JSON.stringify(dashboardVizObject),
            });
          } catch (error) {
            console.warn('Failed to update dashboard viz object time range:', error);
          }

          // Run the visualization paragraph to trigger re-rendering and context regeneration
          await paragraphService.getParagraphRegistry(DASHBOARDS_VISUALIZATION_TYPE)?.runParagraph({
            paragraphState: visualizationParagraph,
            notebookStateValue: state.value,
          });

          paragraphIdsToSave.push(visualizationParagraph.value.id);
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
