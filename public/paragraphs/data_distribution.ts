/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphRegistryItem } from '../services/paragraph_service';
import { DataDistributionContainer } from '../components/notebooks/components/data_distribution/data_distribution_container';
import { AnomalyVisualizationAnalysisOutputResult } from '../../common/types/notebooks';

export const DataDistributionParagraphItem: ParagraphRegistryItem<AnomalyVisualizationAnalysisOutputResult> = {
  renderParagraph: DataDistributionContainer,
};
