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
    const hasBaseline = patternMapDifference && patternMapDifference.length > 0;
    const hasTraces = EXCEPTIONAL && EXCEPTIONAL.length > 0;
    // Note: EXCEPTIONAL only exists when baseline is present AND trace_id_field is configured

    const generateNaturalSummary = () => {
      const filteredLogInsights = logInsights?.filter((pattern) => !pattern.excluded) || [];
      const filteredPatternMapDifference =
        patternMapDifference?.filter((pattern) => !pattern.excluded) || [];
      const filteredExceptional = EXCEPTIONAL?.filter((sequence) => !sequence.excluded) || [];

      const insights = filteredLogInsights.length;
      const differences = filteredPatternMapDifference.length;
      const sequences = filteredExceptional.length;

      const totalErrorCount = filteredLogInsights.reduce((sum, p) => sum + (p.count || 0), 0);

      let summary = `Log pattern analysis completed on index "${index}". `;

      if (insights > 0) {
        const topPattern = filteredLogInsights[0];
        const topPatternPct =
          totalErrorCount > 0 ? ((topPattern.count / totalErrorCount) * 100).toFixed(1) : '0';
        summary += `Found ${insights} distinct error patterns (${totalErrorCount} total errors). `;
        summary += `HIGHEST PRIORITY: "${topPattern.pattern}" (${topPattern.count} occurrences, ${topPatternPct}% of all errors). `;

        if (insights > 1) {
          const secondPattern = filteredLogInsights[1];
          summary += `Second most frequent: "${secondPattern.pattern}" (${secondPattern.count} occurrences). `;
        }
      } else {
        summary += `No error patterns detected. `;
      }

      if (differences > 0) {
        const significantDiffs = filteredPatternMapDifference.filter(
          (p) => Math.abs(p.lift || 0) > 0.1
        );
        const criticalDiffs = filteredPatternMapDifference.filter(
          (p) => Math.abs(p.lift || 0) > 0.5
        );

        summary += `Baseline comparison: ${differences} patterns changed. `;

        if (criticalDiffs.length > 0) {
          const topDiff = criticalDiffs[0];
          const magnitude = Math.abs(topDiff.lift || 0) > 1 ? 'CRITICAL' : 'significant';
          const direction = (topDiff.selection || 0) > (topDiff.base || 0) ? 'spike' : 'drop';
          summary += `${magnitude.toUpperCase()} ${direction}: "${
            topDiff.pattern
          }" changed ${percent(Math.abs(topDiff.lift || 0))} (${percent(topDiff.base)} → ${percent(
            topDiff.selection
          )}). `;
        } else if (significantDiffs.length > 0) {
          summary += `${significantDiffs.length} patterns show notable changes (>10% lift). `;
        }
      }

      if (sequences > 0) {
        summary += `Detected ${sequences} exceptional trace sequences indicating anomalous request flows. `;
      }

      return summary;
    };

    const generateDetailedFindings = () => {
      let details = '';

      const activeLogInsights = logInsights?.filter((pattern) => !pattern.excluded) || [];

      if (activeLogInsights.length > 0) {
        const totalErrors = activeLogInsights.reduce((sum, p) => sum + (p.count || 0), 0);
        details += `Error Patterns:\n`;
        activeLogInsights.slice(0, 5).forEach((pattern, i) => {
          const pct = ((pattern.count / totalErrors) * 100).toFixed(1);
          details += `[${i + 1}] Pattern: "${pattern.pattern}"\n`;
          details += `    Count: ${pattern.count} (${pct}% of errors)\n`;
          if (pattern.sampleLogs?.[0]) {
            const sample =
              pattern.sampleLogs[0].length > 150
                ? pattern.sampleLogs[0].substring(0, 150) + '...'
                : pattern.sampleLogs[0];
            details += `    Sample: "${sample}"\n`;
          }
        });
        details += '\n';
      }

      const activePatternDiff = patternMapDifference?.filter((pattern) => !pattern.excluded) || [];

      if (activePatternDiff.length > 0) {
        const topChanges = activePatternDiff.slice(0, 10);
        details += `Pattern Changes:\n`;
        topChanges.forEach((pattern, i) => {
          const liftAbs = Math.abs(pattern.lift || 0);
          const direction = (pattern.selection || 0) > (pattern.base || 0) ? '↑' : '↓';
          const severity =
            liftAbs > 1
              ? '[CRITICAL]'
              : liftAbs > 0.5
              ? '[HIGH]'
              : liftAbs > 0.2
              ? '[MEDIUM]'
              : '[LOW]';
          details += `[${i + 1}] ${severity} "${pattern.pattern}"\n`;
          details += `    Change: ${direction} ${percent(liftAbs)} (${percent(
            pattern.base
          )} → ${percent(pattern.selection)})\n`;
        });
        details += '\n';
      }

      const activeExceptional = EXCEPTIONAL?.filter((sequence) => !sequence.excluded) || [];

      if (activeExceptional.length > 0) {
        details += `Exceptional Traces:\n`;
        activeExceptional.slice(0, 5).forEach((sequence, i) => {
          details += `[${i + 1}] Trace: ${sequence.traceId}\n`;
          details += `    Sequence: ${sequence.sequence}\n`;
        });
        details += '\n';
      }

      return details;
    };

    const methodologyText = `This step performs ML-powered log pattern analysis on the ${index} index:

1. **Pattern Extraction**: Uses tokenization algorithms to extract common templates from raw log messages by replacing variable values (IDs, timestamps, numbers) with tokens like <token1>, <token2>
2. **Error Pattern Detection (Log Insights)**: Identifies patterns containing error indicators ("error", "exception", "failed", "timeout", "warning") and ranks by occurrence count${
      hasBaseline
        ? '\n3. **Temporal Comparison (Pattern Differences)**: Compares pattern frequencies between baseline and selection periods, calculating lift percentages to detect behavioral changes'
        : ''
    }${
      hasTraces
        ? '\n' +
          (hasBaseline ? '4' : '3') +
          '. **Trace Sequence Analysis (Exceptional Sequences)**: Identifies unusual sequences of log events within single traces that deviate from normal patterns'
        : ''
    }`;

    const terminologyText = `- **Log Pattern**: Template extracted from multiple similar log messages (e.g., "Error connecting to <host> on port <port>" represents all connection errors)
- **Log Insights**: Error-indicating patterns ranked by frequency - these are your primary suspects for issues${
      hasBaseline
        ? '\n- **Pattern Differences**: Patterns with significant frequency changes between time periods\n- **Lift**: Percentage change in pattern frequency (positive = increased, negative = decreased)'
        : ''
    }${
      hasTraces
        ? '\n- **Exceptional Sequences**: Trace-level event chains that differ from normal system behavior'
        : ''
    }
- **Sample Logs**: Actual log message examples showing the pattern in context`;

    const priorityText = hasBaseline
      ? `**Priority Order**:
1. Start with [CRITICAL] and [HIGH] severity pattern changes - these indicate acute issues
2. Investigate highest-count error patterns - these affect the most requests${
          hasTraces ? '\n3. Examine exceptional traces for complex failure scenarios' : ''
        }`
      : `**Priority Order**:
1. Investigate highest-count error patterns - these affect the most requests${
          hasTraces ? '\n2. Examine exceptional traces for complex failure scenarios' : ''
        }`;

    return `## Log Pattern Analysis Results

### Analysis Methodology
${methodologyText}

### Analysis Results
${generateNaturalSummary()}

${generateDetailedFindings()}

### Key Terminology
${terminologyText}

### Investigation Guidelines
**PRIMARY EVIDENCE**: Use these patterns as concrete evidence for root cause analysis.

${priorityText}

**Query Construction**:
Patterns contain tokens (<token1>, <token2>) representing variable values. To query:
1. Extract keywords: Remove tokens, use static text (e.g., "Failed to connect to <host>" → "Failed to connect")
2. Use sample logs: Copy exact phrases for precise queries
3. Trace queries: Search by trace_id field (common names: trace_id, traceId, trace.id, span.trace_id)
4. Field discovery: Check index mapping for field names (message, body, log, content for logs)

**Root Cause Analysis**:
- Quote specific patterns with their metrics (count, lift %) as evidence
- Correlate pattern changes with deployment times or system events
- Link multiple related patterns to identify common root causes
- Reference sample logs to validate hypotheses
`;
  },
  runParagraph: async () => {
    return;
  },
};
