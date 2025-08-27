/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AI_RESPONSE_TYPE,
  DASHBOARDS_VISUALIZATION_TYPE,
  DATA_DISTRIBUTION_PARAGRAPH_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  OBSERVABILITY_VISUALIZATION_TYPE,
  OTHER_PARAGRAPH_TYPE,
} from '../../common/constants/notebooks';
import { DataDistributionParagraphItem } from './data_distribution';
import { LogPatternParagraphItem } from './log_analytics';
import { MarkdownParagraphItem } from './markdown';
import { OtherParagraphItem } from './other';
import { PERAgentParagraphItem } from './per_agent';
import { PPLParagraphItem } from './ppl';
import { VisualizationParagraphItem } from './visualization';

export const paragraphRegistry = [
  { types: [OTHER_PARAGRAPH_TYPE], item: OtherParagraphItem },
  { types: [DATA_DISTRIBUTION_PARAGRAPH_TYPE], item: DataDistributionParagraphItem },
  { types: [LOG_PATTERN_PARAGRAPH_TYPE], item: LogPatternParagraphItem },
  { types: [DEEP_RESEARCH_PARAGRAPH_TYPE, AI_RESPONSE_TYPE], item: PERAgentParagraphItem },
  {
    types: [
      DASHBOARDS_VISUALIZATION_TYPE.toUpperCase(),
      OBSERVABILITY_VISUALIZATION_TYPE.toUpperCase(),
      DASHBOARDS_VISUALIZATION_TYPE,
      OBSERVABILITY_VISUALIZATION_TYPE,
    ],
    item: VisualizationParagraphItem,
  },
  { types: ['ppl', 'sql'], item: PPLParagraphItem },
  { types: ['md'], item: MarkdownParagraphItem },
];
