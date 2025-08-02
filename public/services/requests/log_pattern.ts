/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogPatternAnalysisResult } from 'common/types/log_pattern';
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
