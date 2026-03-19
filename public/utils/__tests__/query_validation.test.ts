/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateDSLQuery, validatePPLQuery } from '../query_validation';
import { HttpStart } from '../../../../../src/core/public';
import * as pluginProxyCall from '../../plugin_helpers/plugin_proxy_call';

jest.mock('../../plugin_helpers/plugin_proxy_call');

describe('Query Validation', () => {
  let mockHttp: jest.Mocked<HttpStart>;

  beforeEach(() => {
    mockHttp = {
      post: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  describe('validatePPLQuery', () => {
    it('should validate a correct PPL query', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockResolvedValue({});

      const result = await validatePPLQuery(
        mockHttp,
        'source = logs | where status="error"',
        'test-ds'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockCallOpenSearchCluster).toHaveBeenCalledWith({
        http: mockHttp,
        dataSourceId: 'test-ds',
        request: {
          path: '/_plugins/_ppl/_explain',
          method: 'POST',
          body: JSON.stringify({ query: 'source = logs | where status="error"' }),
        },
      });
    });

    it('should reject empty PPL query', async () => {
      const result = await validatePPLQuery(mockHttp, '   ', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('PPL query cannot be empty');
    });

    it('should reject PPL query without source keyword', async () => {
      const result = await validatePPLQuery(mockHttp, 'where status="error"', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid PPL syntax');
      expect(result.error).toContain('must start with "source = <index>"');
    });

    it('should handle PPL validation errors from OpenSearch', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockRejectedValue({
        body: {
          error: {
            reason: 'Invalid PPL syntax: unexpected token',
          },
        },
      });

      const result = await validatePPLQuery(mockHttp, 'source = logs | invalid', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid PPL syntax: unexpected token');
    });

    it('should accept PPL query with "search source" syntax', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockResolvedValue({});

      const result = await validatePPLQuery(mockHttp, 'search source = logs', 'test-ds');

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDSLQuery', () => {
    it('should validate a correct DSL query', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockResolvedValue({ valid: true });

      const dslQuery = JSON.stringify({ match: { message: 'error' } });
      const result = await validateDSLQuery(mockHttp, dslQuery, 'logs-*', 'test-ds');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockCallOpenSearchCluster).toHaveBeenCalledWith({
        http: mockHttp,
        dataSourceId: 'test-ds',
        request: {
          path: '/logs-*/_validate/query?explain=true',
          method: 'POST',
          body: JSON.stringify({ query: { match: { message: 'error' } } }),
        },
      });
    });

    it('should reject empty DSL query', async () => {
      const result = await validateDSLQuery(mockHttp, '   ', 'logs-*', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('DSL query cannot be empty');
    });

    it('should reject invalid JSON', async () => {
      const result = await validateDSLQuery(mockHttp, '{ invalid json }', 'logs-*', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });

    it('should reject non-object JSON', async () => {
      const result = await validateDSLQuery(mockHttp, '"string"', 'logs-*', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('DSL query must be a valid JSON object');
    });

    it('should handle DSL validation errors from OpenSearch', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockResolvedValue({
        valid: false,
        explanations: [
          {
            error: 'no such field [invalid_field]',
          },
        ],
      });

      const dslQuery = JSON.stringify({ match: { invalid_field: 'value' } });
      const result = await validateDSLQuery(mockHttp, dslQuery, 'logs-*', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no such field [invalid_field]');
    });

    it('should handle validation API errors', async () => {
      const mockCallOpenSearchCluster = jest.spyOn(pluginProxyCall, 'callOpenSearchCluster');
      mockCallOpenSearchCluster.mockRejectedValue({
        body: {
          error: {
            reason: 'index_not_found_exception',
          },
        },
      });

      const dslQuery = JSON.stringify({ match_all: {} });
      const result = await validateDSLQuery(mockHttp, dslQuery, 'missing-index', 'test-ds');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('DSL query validation failed');
    });
  });
});
