/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { addSamplingFilter, executePPLQueryWithSampling } from '../query';
import { callOpenSearchCluster } from '../../plugin_helpers/plugin_proxy_call';

jest.mock('../../plugin_helpers/plugin_proxy_call');
const mockCallOpenSearchCluster = callOpenSearchCluster as jest.MockedFunction<
  typeof callOpenSearchCluster
>;

const mockHttp = {
  post: jest.fn(),
};

describe('Query Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSamplingFilter', () => {
    it('should generate sampling filter with correct score', () => {
      const query = 'source=logs';
      const count = 1000;
      const result = addSamplingFilter(query, count);

      expect(result).toBe(
        'source=logs | eval random_score=rand() | where random_score > 0.89 | head 100'
      );
    });

    it('should handle smaller count', () => {
      const query = 'source=logs';
      const count = 400;
      const result = addSamplingFilter(query, count);

      expect(result).toBe(
        'source=logs | eval random_score=rand() | where random_score > 0.74 | head 100'
      );
    });

    it('should handle very small counts with minimum score of 0', () => {
      const result = addSamplingFilter('source=logs', 50);
      expect(result).toBe(
        'source=logs | eval random_score=rand() | where random_score > 0 | head 100'
      );
    });
  });

  describe('executePPLQueryWithSampling', () => {
    it('should execute query with head limit when count is small', async () => {
      const countResponse = { datarows: [[50]] };
      const queryResponse = { schema: [], datarows: [] };

      mockCallOpenSearchCluster
        .mockResolvedValueOnce(countResponse)
        .mockResolvedValueOnce(queryResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs',
      };

      await executePPLQueryWithSampling(params);

      expect(mockCallOpenSearchCluster).toHaveBeenCalledTimes(2);
      expect(mockCallOpenSearchCluster).toHaveBeenLastCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({ query: 'source=logs | head 100' }),
        },
      });
    });

    it('should execute query with sampling when count is large', async () => {
      const countResponse = { datarows: [[1000]] };
      const queryResponse = { schema: [], datarows: [] };

      mockCallOpenSearchCluster
        .mockResolvedValueOnce(countResponse)
        .mockResolvedValueOnce(queryResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs',
      };

      await executePPLQueryWithSampling(params);

      expect(mockCallOpenSearchCluster).toHaveBeenLastCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({
            query: 'source=logs | eval random_score=rand() | where random_score > 0.89 | head 100',
          }),
        },
      });
    });

    it('should skip count check for queries with stats count()', async () => {
      const queryResponse = { schema: [], datarows: [] };
      mockCallOpenSearchCluster.mockResolvedValueOnce(queryResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs | stats count()',
      };

      await executePPLQueryWithSampling(params);

      expect(mockCallOpenSearchCluster).toHaveBeenCalledTimes(1);
      expect(mockCallOpenSearchCluster).toHaveBeenCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({ query: 'source=logs | stats count() | head 100' }),
        },
      });
    });

    it('should fallback to head limit when count query fails', async () => {
      const mockError = new Error('Count query failed');
      const queryResponse = { schema: [], datarows: [] };

      mockCallOpenSearchCluster
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(queryResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs',
      };

      await executePPLQueryWithSampling(params);

      expect(mockCallOpenSearchCluster).toHaveBeenCalledTimes(2);
      expect(mockCallOpenSearchCluster).toHaveBeenLastCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({ query: 'source=logs | head 100' }),
        },
      });
    });
  });
});
