/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TopologyParagraph } from '../components/notebooks/components/paragraph_components/topology';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const TopologyParagraphItem: ParagraphRegistryItem = {
  ParagraphComponent: TopologyParagraph,
  getContext: async () => {
    return '';
  },
  runParagraph: async () => {
    return;
  },
};
