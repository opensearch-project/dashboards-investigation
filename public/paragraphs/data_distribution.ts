/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphRegistryItem } from '../services/paragraph_service';
import { DataDistributionContainer } from '../components/notebooks/components/data_distribution/data_distribution_container';
import { AnomalyVisualizationAnalysisOutputResult } from '../../common/types/notebooks';

export const DataDistributionParagraphItem: ParagraphRegistryItem<AnomalyVisualizationAnalysisOutputResult> = {
  ParagraphComponent: DataDistributionContainer,
  getContext: async (paragraph) => {
    return `
      ## Step description
      This step calculate fields' distribution and find the outlines between baselineTimeRange and selectionTimeRange. 
      These statistical deviations highlight potential areas of concern that may explain the underlying issue.

      ## Step result:
      Anomaly detection has been performed on the data and the analysis identified anomalies in the following fields:
      ${JSON.stringify(paragraph?.output?.[0].result.fieldComparison)}.
    `;
  },
};
