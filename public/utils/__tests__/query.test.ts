/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addSamplingFilter,
  executePPLQueryWithSampling,
  removeRandomScoreFromResponse,
} from '../query';
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

  describe('removeRandomScoreFromResponse', () => {
    it('should remove random_score from schema and datarows', () => {
      const response = {
        schema: [
          { name: 'FlightNum', type: 'string' },
          { name: 'random_score', type: 'float' },
        ],
        datarows: [
          ['8EY59TH', 0.4150576],
          ['IK60892', 0.53712994],
        ],
      };

      const result = removeRandomScoreFromResponse(response);

      expect(result.schema).toEqual([{ name: 'FlightNum', type: 'string' }]);
      expect(result.datarows).toEqual([['8EY59TH'], ['IK60892']]);
    });

    it('should handle response without schema', () => {
      const response = {
        datarows: [
          ['data1', 0.123],
          ['data2', 0.456],
        ],
      };

      const result = removeRandomScoreFromResponse(response);
      expect(result.datarows).toEqual([
        ['data1', 0.123],
        ['data2', 0.456],
      ]);
    });

    it('should not remove datarows when random_score not in schema', () => {
      const response = {
        schema: [
          { name: 'FlightNum', type: 'string' },
          { name: 'Origin', type: 'string' },
        ],
        datarows: [
          ['8EY59TH', 'NYC'],
          ['IK60892', 'LAX'],
        ],
      };

      const result = removeRandomScoreFromResponse(response);

      expect(result.schema).toEqual([
        { name: 'FlightNum', type: 'string' },
        { name: 'Origin', type: 'string' },
      ]);
      expect(result.datarows).toEqual([
        ['8EY59TH', 'NYC'],
        ['IK60892', 'LAX'],
      ]);
    });

    it('should remove random_score from middle position', () => {
      const response = {
        schema: [
          { name: 'FlightNum', type: 'string' },
          { name: 'random_score', type: 'float' },
          { name: 'Origin', type: 'string' },
        ],
        datarows: [
          ['8EY59TH', 0.4150576, 'NYC'],
          ['IK60892', 0.53712994, 'LAX'],
        ],
      };

      const result = removeRandomScoreFromResponse(response);

      expect(result.schema).toEqual([
        { name: 'FlightNum', type: 'string' },
        { name: 'Origin', type: 'string' },
      ]);
      expect(result.datarows).toEqual([
        ['8EY59TH', 'NYC'],
        ['IK60892', 'LAX'],
      ]);
    });

    it('should handle empty response', () => {
      const response = {};
      const result = removeRandomScoreFromResponse(response);
      expect(result).toEqual({});
    });
  });
});
