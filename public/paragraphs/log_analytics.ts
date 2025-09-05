/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogPatternAnalysisResult } from '../../common/types/log_pattern';
import { LogPatternContainer } from '../components/notebooks/components/log_analytics/log_pattern_container';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const LogPatternParagraphItem: ParagraphRegistryItem<LogPatternAnalysisResult> = {
  ParagraphComponent: LogPatternContainer,
  getContext: async (paragraph) => {
    const { logInsights, patternMapDifference, EXCEPTIONAL } = paragraph?.output?.[0].result! || {};
    const index = paragraph?.input.parameters?.index || '';

    const percent = (value: number | undefined) => {
      return value !== undefined ? `${(value * 100).toFixed(2)}%` : 'N/A';
    };

    // Generate natural language summary
    const generateNaturalSummary = () => {
      const insights = logInsights?.length || 0;
      const differences = patternMapDifference?.length || 0;
      const sequences = EXCEPTIONAL ? Object.keys(EXCEPTIONAL).length : 0;

      let summary = `I performed an initial log pattern analysis on the ${index} index. `;

      if (insights > 0) {
        summary += `I found ${insights} error patterns that indicate potential issues. `;
        const topPattern = logInsights[0];
        summary += `The most frequent error pattern is "${topPattern.pattern}" with ${topPattern.count} occurrences. `;
      } else {
        summary += `No significant error patterns were detected. `;
      }

      if (differences > 0) {
        summary += `When comparing the current period to the baseline, I identified ${differences} patterns with notable changes in frequency. `;
        const significantDiffs =
          patternMapDifference?.filter((p) => Math.abs(p.lift || 0) > 0.1) || [];
        if (significantDiffs.length > 0) {
          summary += `${significantDiffs.length} of these show significant increases or decreases that warrant investigation. `;
        }
      } else {
        summary += `The log patterns appear consistent with the baseline period. `;
      }

      if (sequences > 0) {
        summary += `I also discovered ${sequences} exceptional trace sequences that deviate from normal patterns. `;
        summary += `These sequences may indicate complex error scenarios or unusual system behavior. `;
      } else {
        summary += `All trace sequences appear to follow normal patterns. `;
      }

      return summary;
    };

    const generateDetailedFindings = () => {
      let details = '';

      if (logInsights && logInsights.length > 0) {
        details += 'Key Error Patterns:\n';
        logInsights.slice(0, 5).forEach((pattern, i) => {
          details += `${i + 1}. "${pattern.pattern}" occurred ${pattern.count} times`;
          if (pattern.sampleLogs?.[0]) {
            details += ` (example: "${pattern.sampleLogs[0]}")`;
          }
          details += '\n';
        });
        details += '\n';
      }

      if (patternMapDifference && patternMapDifference.length > 0) {
        details += 'Pattern Changes from Baseline:\n';
        patternMapDifference.slice(0, 20).forEach((pattern, i) => {
          const change = (pattern.selection || 0) > (pattern.base || 0) ? 'increased' : 'decreased';
          details += `${i + 1}. "${pattern.pattern}" ${change} by ${percent(
            Math.abs(pattern.lift || 0)
          )} `;
          details += `(from ${percent(pattern.base)} to ${percent(pattern.selection)})\n`;
        });
        details += '\n';
      }

      if (EXCEPTIONAL && Object.keys(EXCEPTIONAL).length > 0) {
        details += 'Exceptional Trace Sequences:\n';
        Object.entries(EXCEPTIONAL)
          .slice(0, 5)
          .forEach(([traceId, sequence], i) => {
            details += `${i + 1}. Trace ${traceId}: ${sequence}\n`;
          });
      }

      return details;
    };

    return `## Log Pattern Analysis Results

I have performed an automated log pattern analysis on the ${index} index using advanced pattern recognition algorithms. This analysis extracted common templates from raw log data, identified error patterns, compared current patterns against baseline behavior, and detected exceptional trace sequences that deviate from normal system operation.

Key Terminology:
- Log Pattern: A common template found in multiple log messages (e.g., "Error connecting to database" appears in many logs with different details)
- Log Insights: Patterns that suggest problems - typically containing words like "error", "exception", "failed", or "timeout"
- Pattern Differences: When a log pattern appears much more or less frequently than usual compared to a previous time period
- Lift: A percentage showing how much a pattern increased (+) or decreased (-) compared to normal baseline behavior
- Log Sequence: A chain of related log events that happened for the same request or transaction, tracked by trace ID

OpenSearch Query Strategy:
Since patterns contain tokens like <token1>, <token2>, use these approaches:

1. Extract Keywords from Patterns: Remove tokens and use meaningful words
   - Pattern: "Failed to connect to <host> on port <port>"
   - Query: "Failed to connect" OR "connection failed"

2. Use Pattern Keywords: Focus on static text that indicates the issue
   - Look for: error types, service names, operation names
   - Avoid: tokens, timestamps, IDs, variable values

3. Trace ID Queries: Use exceptional sequences to follow error flows
   - First discover the correct trace field name in your index
   - Common field names: trace_id, traceId, trace.id, span.trace_id
   - Query all events for that trace to see the complete sequence

4. Field Discovery: Check your index mapping to find correct field names
   - Message fields: message, body, log, content, text
   - Trace fields: trace_id, traceId, trace.id
   - Time fields: @timestamp, timestamp, time

${generateNaturalSummary()}

${generateDetailedFindings()}`;
  },
  runParagraph: async () => {
    return;
  },
};
