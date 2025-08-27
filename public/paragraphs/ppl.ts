/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PPLParagraph,
  QueryObject,
} from '../components/notebooks/components/paragraph_components/ppl';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const PPLParagraphItem: ParagraphRegistryItem<string, unknown, QueryObject> = {
  ParagraphComponent: PPLParagraph,
};
