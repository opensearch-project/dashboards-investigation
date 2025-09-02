/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addHeadFilter,
  removeRandomScoreFromResponse,
  executePPLQueryWithHeadFilter,
} from '../query';
import { callOpenSearchCluster } from '../../plugin_helpers/plugin_proxy_call';

// Mock the callOpenSearchCluster function
jest.mock('../../plugin_helpers/plugin_proxy_call');
const mockCallOpenSearchCluster = callOpenSearchCluster as jest.MockedFunction<
  typeof callOpenSearchCluster
>;

// Mock the http service
const mockHttp = {
  post: jest.fn(),
};

describe('Query Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addHeadFilter', () => {
    it('should append random sorting and head filter to query', () => {
      const query = 'source=logs';
      const result = addHeadFilter(query);

      expect(result).toBe(
        'source=logs | eval random_score = rand() | sort random_score | head 100'
      );
    });

    it('should handle complex query', () => {
      const query = 'source=logs | where status="error" | stats count by host';
      const result = addHeadFilter(query);

      expect(result).toBe(
        'source=logs | where status="error" | stats count by host | eval random_score = rand() | sort random_score | head 100'
      );
    });

    it('should handle empty query', () => {
      const result = addHeadFilter('');
      expect(result).toBe(' | eval random_score = rand() | sort random_score | head 100');
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

  describe('executePPLQueryWithHeadFilter', () => {
    it('should call callOpenSearchCluster with correct parameters', async () => {
      const mockResponse = {
        schema: [
          { name: 'FlightNum', type: 'string' },
          { name: 'random_score', type: 'float' },
        ],
        datarows: [['8EY59TH', 0.4150576]],
      };

      mockCallOpenSearchCluster.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs',
      };

      const result = await executePPLQueryWithHeadFilter(params);

      expect(mockCallOpenSearchCluster).toHaveBeenCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({
            query: 'source=logs | eval random_score = rand() | sort random_score | head 100',
          }),
        },
      });

      expect(result.schema).toEqual([{ name: 'FlightNum', type: 'string' }]);
      expect(result.datarows).toEqual([['8EY59TH']]);
    });

    it('should propagate errors from callOpenSearchCluster', async () => {
      const mockError = new Error('Query execution failed');
      mockCallOpenSearchCluster.mockRejectedValue(mockError);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'invalid query',
      };

      await expect(executePPLQueryWithHeadFilter(params)).rejects.toThrow('Query execution failed');
    });
  });
});
