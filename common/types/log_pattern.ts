/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LogPattern {
  pattern: string;
  count: number;
  sampleLogs?: string[];
  base?: number;
  selection?: number;
  lift?: number;
}

export interface LogSequenceEntry {
  [key: string]: string;
}

export interface LogPatternAnalysisResult {
  logInsights: LogPattern[];
  patternMapDifference?: LogPattern[];
  EXCEPTIONAL?: LogSequenceEntry;
  BASE?: LogSequenceEntry;
}
