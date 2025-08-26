/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DeepResearchInputParameters,
  DeepResearchOutputResult,
} from '../../common/types/notebooks';
import { DeepResearchParagraph } from '../components/notebooks/components/paragraph_components/deep_research';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const PERAgentParagraphItem: ParagraphRegistryItem<
  DeepResearchOutputResult | string,
  DeepResearchInputParameters
> = {
  renderParagraph: DeepResearchParagraph,
};
