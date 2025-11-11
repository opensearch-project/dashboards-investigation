/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphRegistryItem } from '../services/paragraph_service';
import { DataDistributionContainer } from '../components/notebooks/components/data_distribution/data_distribution_container';
import {
  AnomalyVisualizationAnalysisOutputResult,
  NoteBookSource,
  SummaryDataItem,
} from '../../common/types/notebooks';
import { DataDistributionService } from '../components/notebooks/components/data_distribution/data_distribution_service';
import { getPPLQueryWithTimeRange } from '../utils/time';
import { ParagraphState } from '../../common/state/paragraph_state';
import { getNotifications } from '../services';

export const DataDistributionParagraphItem: ParagraphRegistryItem<AnomalyVisualizationAnalysisOutputResult> = {
  ParagraphComponent: DataDistributionContainer,
  getContext: async (paragraph) => {
    const selectedFieldComparison = paragraph?.output?.[0]?.result?.fieldComparison?.filter(
      (item) => !item.excludeFromContext
    );
    return ` ## Data Distribution Analysis Results

### Step description
This step calculate fields' distribution and find the outlines between baselineTimeRange and selectionTimeRange.
These statistical deviations highlight potential areas of concern that may explain the underlying issue.

### Step result:
Anomaly detection has been performed on the data and the analysis identified anomalies in the following fields:
${JSON.stringify(selectedFieldComparison)}.
    `;
  },
  runParagraph: async ({ paragraphState, saveParagraph, notebookStateValue }) => {
    const paragraph = paragraphState.value;
    const {
      timeRange,
      timeField,
      index,
      dataSourceId,
      filters,
      source,
      variables,
    } = notebookStateValue.context.value;

    const updateLoadingState = (
      fetchLoading: boolean,
      distributionLoading: boolean,
      error?: string
    ) => {
      paragraphState.updateUIState({
        dataDistribution: {
          fetchDataLoading: fetchLoading,
          distributionLoading,
          ...(error && { error }),
        },
      });
    };

    try {
      updateLoadingState(true, true);
      if (!timeRange || !timeField || !index) {
        throw new Error('Missing essential parameters: timeRange, timeField, index');
      }
      const dataDistributionService = new DataDistributionService();
      dataDistributionService.setConfig(dataSourceId, index, timeField, source);
      let dataDistribution: SummaryDataItem[];

      if (source === NoteBookSource.DISCOVER) {
        const pplQuery = variables?.['pplQuery'] as string;
        if (!pplQuery) {
          throw new Error('Missing PPL query in discover source');
        }

        const pplData = await dataDistributionService.fetchPPlData(
          getPPLQueryWithTimeRange(
            pplQuery,
            timeRange.selectionFrom,
            timeRange.selectionTo,
            timeField
          )
        );

        updateLoadingState(false, true);
        dataDistribution = await dataDistributionService.getSingleDataDistribution(pplData);
      } else {
        const comparisonData = await dataDistributionService.fetchComparisonData({
          timeRange,
          selectionFilters: filters,
        });
        updateLoadingState(false, true);
        dataDistribution = await dataDistributionService.getComparisonDataDistribution(
          comparisonData
        );
      }

      if (paragraph) {
        await saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraph, {
            fieldComparison: dataDistribution || [],
          }),
        });
      }
      updateLoadingState(false, false);
    } catch (error) {
      updateLoadingState(false, false, error.message);
      getNotifications().toasts.addDanger(error.message);
    }
  },
};
