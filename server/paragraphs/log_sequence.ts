/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const LogPatternParagraph: ParagraphRegistryItem<LogPatternAnalysisResult> = {
  getContext: async ({ paragraph }) => {
    const { logInsights, patternMapDifference, EXCEPTIONAL } = paragraph.output?.[0].result! || {};

    const percent = (value: number | undefined) => {
      return value !== undefined ? `${(value * 100).toFixed(2)}%` : 'N/A';
    };

    const logInsightContext = logInsights
      .slice(0, 5)
      .map(
        (pattern) => `
      - Pattern: \`${pattern.pattern}\` (Count: ${pattern.count})
        Example: ${
          pattern.sampleLogs && pattern.sampleLogs.length > 0 ? pattern.sampleLogs[0] : '--'
        }
      `
      )
      .join('\n');

    const patternMapDifferenceContext =
      patternMapDifference && patternMapDifference.length > 0
        ? patternMapDifference
            .slice(0, 20)
            .map(
              (pattern) => `
      - Diff: \`${pattern.pattern}\` (Selection: ${percent(pattern.selection)}, Baseline: ${percent(
                pattern.base
              )}, Lift: ${percent(pattern.lift)})`
            )
            .join('\n')
        : 'None Difference detected';

    const logSequenceContext =
      EXCEPTIONAL && Object.entries(EXCEPTIONAL).length > 0
        ? Object.entries(EXCEPTIONAL)
            .map(([key, value]) => `- trace id: ${key}, example log sequence: \`${value}\``)
            .join('\n')
        : '- No exceptional sequence detected';

    return `
      Step: Initial analysis by using Log pattern/sequence method
      Step Result:
      ## Log pattern/sequence analysis

      ### Terminology
      0. **Log Pattern**: A pattern is a template extract from raw log data by log template technology like Drain3 and BRAIN algorithm.
      1. **Log Insights**: Log patterns that indicates errors, exceptions, or outliers.
      2. **Pattern Differences**: Differences in log pattern between two time periods(selection and baseline) to indicate anomalies.
      3. **Lift**: A statistical measure indicating the strength of a pattern's increase or decrease in frequency compared to a baseline.
      4. **Log Sequence**: A series of log pattern that occur with the same trace id ordered by timestamp ascending.

      ### Steps
      1. Get the log insight from selection period and result puts in \`Log insights\` section.
      2. Compare the log pattern between selection period and baseline period to get the pattern differences and result puts in \`Key Pattern Differences\` section.
      3. Use clustering technique to group similar log sequence into a cluster, then use the baseline period to identify the abnormal log sequences in selection period and result puts in \`Log Sequence Analysis\` section.

      ### Analysis Results

      #### Log insights
      ${logInsightContext}

      #### Key Pattern Differences
      ${patternMapDifferenceContext}

      #### Log Sequence Analysis
      ${logSequenceContext}
    `;
  },
};
