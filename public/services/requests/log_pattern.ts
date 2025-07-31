/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../../src/core/public';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';

export interface LogPatternAnalysisParams {
  baselineStartTime?: string;
  baselineEndTime?: string;
  selectionStartTime: string;
  selectionEndTime: string;
  timeField?: string;
  traceIdField?: string;
  logMessageField: string;
  indexName?: string;
  dataSourceMDSId?: string;
}
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

export class LogPatternService {
  constructor(private readonly http: HttpSetup) {}

  /**
   * Analyze log patterns
   * @param params Parameters for log pattern analysis
   * @returns Analysis results
   */
  async analyzeLogPatterns(params: LogPatternAnalysisParams): Promise<LogPatternAnalysisResult> {
    const response = await this.http.post(`${NOTEBOOKS_API_PREFIX}/logpattern/analyze`, {
      body: JSON.stringify(params),
    });
    return response;
  }
}
