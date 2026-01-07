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
import { getNotifications } from '../services';

export const DataDistributionParagraphItem: ParagraphRegistryItem<AnomalyVisualizationAnalysisOutputResult> = {
  ParagraphComponent: DataDistributionContainer,
  getContext: async (paragraph) => {
    const allFieldComparison = paragraph?.output?.[0]?.result?.fieldComparison || [];
    const selectedFieldComparison = allFieldComparison.filter((item) => !item.excludeFromContext);

    if (selectedFieldComparison.length === 0) {
      return '';
    }

    const hasBaseline = selectedFieldComparison.some((f) =>
      f.topChanges.some((c) => c.baselinePercentage !== undefined)
    );

    const methodologyText = hasBaseline
      ? `Compares field value distributions between baseline and selection periods:
- Analyzes categorical fields (keyword, boolean, text) and numeric fields (grouped into ranges)
- Calculates percentage distribution for each field value
- Ranks fields by divergence score (maximum percentage point shift between periods)`
      : `Analyzes field value distributions in the selected time period:
- Examines categorical fields (keyword, boolean, text) and numeric fields (grouped into ranges)
- Calculates percentage distribution for each field value
- Shows fields with highest cardinality and most significant values`;

    const guidelinesText = hasBaseline
      ? `**PRIMARY EVIDENCE**: Use divergence scores and distribution shifts as concrete evidence.

**Priority**: 
- [CRITICAL] divergence >30%: Severe behavioral change
- [HIGH] divergence >15%: Significant change requiring investigation  
- [MEDIUM] divergence >5%: Notable change worth examining

**Investigation Strategy**:
1. Start with highest divergence fields - these show the strongest anomalies
2. Look for correlated changes across multiple fields (e.g., error_code + status_code + response_time)
3. Examine topChanges for each field to identify which specific values shifted
4. Quantify impact using baseline → selection percentages
5. Cross-reference with log patterns to validate hypotheses`
      : `**PRIMARY EVIDENCE**: Use field distributions to understand data characteristics.

**Investigation Strategy**:
1. Look for error-related fields (status_code, error_code, level, severity) with high error percentages
2. Examine fields with concentrated distributions (>80% in single value) - may indicate systemic issues
3. Check topChanges to identify dominant field values that correlate with problems
4. Cross-reference field values with log patterns to identify root causes`;

    const formatFieldData = () => {
      return selectedFieldComparison
        .map((field, i) => {
          const changes = field.topChanges
            .map((c) => {
              if (c.baselinePercentage !== undefined) {
                return `  - "${c.value}": ${(c.baselinePercentage * 100).toFixed(1)}% → ${(
                  c.selectionPercentage * 100
                ).toFixed(1)}%`;
              }
              return `  - "${c.value}": ${(c.selectionPercentage * 100).toFixed(1)}%`;
            })
            .join('\n');

          if (hasBaseline) {
            return `[${i + 1}] Field: ${field.field}\n  Divergence: ${(
              field.divergence * 100
            ).toFixed(1)}%\n  Top Values:\n${changes}`;
          }
          return `[${i + 1}] Field: ${field.field}\n  Top Values:\n${changes}`;
        })
        .join('\n\n');
    };

    return `## Data Distribution Analysis

### Methodology
${methodologyText}

### Field Data
${formatFieldData()}

### Analysis Guidelines
${guidelinesText}

**Query Construction**:
- Use field names and top values to build targeted queries
- Filter by high-percentage values to focus on dominant behaviors
- Combine multiple fields to narrow down root cause
    `;
  },
  runParagraph: async ({ paragraphState, notebookStateValue }) => {
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

      paragraphState.updateOutput({
        result: {
          fieldComparison: dataDistribution || [],
        },
      });
      updateLoadingState(false, false);
    } catch (error) {
      updateLoadingState(
        false,
        false,
        error.message || error.body || 'Failed to fetch data distribution'
      );
      getNotifications().toasts.addDanger(error.message);
    }
  },
};
