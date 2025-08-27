/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogPatternAnalysisResult } from '../../common/types/log_pattern';
import { LogPatternContainer } from '../components/notebooks/components/log_analytics/log_pattern_container';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const LogPatternParagraphItem: ParagraphRegistryItem<LogPatternAnalysisResult> = {
  ParagraphComponent: LogPatternContainer,
};
