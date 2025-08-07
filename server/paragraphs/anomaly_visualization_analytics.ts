/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnomalyVisualizationAnalysisOutputResult } from 'common/types/notebooks';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const AnomalyVisualizationAnalysisParagraph: ParagraphRegistryItem<AnomalyVisualizationAnalysisOutputResult> = {
  getContext: async ({ paragraph }) => {
    return `
      ## Step description
      This step calculate fields' distribution and find the outlines between baselineTimeRange and selectionTimeRange.

      ## Step result:
      Anomaly detection has been performed on the data and the analysis identified anomalies in the following fields:
      ${JSON.stringify(paragraph.output?.[0].result.fieldComparison)}.
      These statistical deviations highlight potential areas of concern that may explain the underlying issue.
    `;
  },
};
