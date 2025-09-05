/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisualizationParagraph } from '../components/notebooks/components/paragraph_components/visualization';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const VisualizationParagraphItem: ParagraphRegistryItem = {
  ParagraphComponent: VisualizationParagraph,
  runParagraph: async () => {
    return;
  },
};
