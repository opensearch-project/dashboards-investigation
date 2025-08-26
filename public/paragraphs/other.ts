/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OtherParagraph } from '../components/notebooks/components/paragraph_components/other';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const OtherParagraphItem: ParagraphRegistryItem<string> = {
  renderParagraph: OtherParagraph,
};
