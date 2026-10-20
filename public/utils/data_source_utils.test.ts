/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { isAnalyticEngineDataSource } from './data_source_utils';

describe('isAnalyticEngineDataSource', () => {
  it('should return true when type is AnalyticEngine', () => {
    expect(isAnalyticEngineDataSource('AnalyticEngine')).toBe(true);
  });

  it('should return false when type is OpenSearch', () => {
    expect(isAnalyticEngineDataSource('OpenSearch')).toBe(false);
  });

  it('should return false when type is undefined', () => {
    expect(isAnalyticEngineDataSource(undefined)).toBe(false);
  });
});
