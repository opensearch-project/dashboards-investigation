/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const LogPatternParagraph: ParagraphRegistryItem<LogPatternAnalysisResult> = {
  getContext: async ({ paragraph }) => {
    const { logInsights, patternMapDifference, EXCEPTIONAL, BASE } =
      paragraph.output?.[0].result! || {};
    return `
      Step: This step analyzed log patterns using clustering algorithms to identify recurring patterns and anomalies.
      Step result: 

      ### Pattern Summary
      - Total patterns: ${logInsights.length}
      - Pattern differences: ${patternMapDifference ? patternMapDifference.length : 0}
      - Analyzed sequence types: ${[EXCEPTIONAL ? 'EXCEPTIONAL' : '', BASE ? 'BASE' : '']
        .filter(Boolean)
        .join(', ')}

      ### Top Patterns
      ${logInsights
        .slice(0, 5)
        .map(
          (pattern) => `
      - Pattern: \`${pattern.pattern}\` (Count: ${pattern.count}, Lift: ${
            pattern.lift !== undefined ? pattern.lift : 'N/A'
          })
        Example: \`${
          pattern.sampleLogs && pattern.sampleLogs.length > 0
            ? pattern.sampleLogs[0]
            : 'No example available'
        }\`
      `
        )
        .join('')}
      ${logInsights.length > 5 ? `...and ${logInsights.length - 5} more patterns` : ''}

      ### Key Pattern Differences
      ${
        patternMapDifference && patternMapDifference.length > 0
          ? patternMapDifference
              .slice(0, 3)
              .map(
                (pattern) => `
      - Diff: \`${pattern.pattern}\` (Count: ${pattern.count}, Lift: ${
                  pattern.lift !== undefined ? pattern.lift : 'N/A'
                })
      `
              )
              .join('') +
            (patternMapDifference.length > 3
              ? `...and ${patternMapDifference.length - 3} more differences`
              : '')
          : 'None detected'
      }

      These patterns reveal potential system behavior anomalies and correlations between events. Higher lift values indicate stronger statistical correlations between log events.
    `;
  },
};
