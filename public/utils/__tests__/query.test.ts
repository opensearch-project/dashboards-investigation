/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { addHeadFilter, executePPLQueryWithHeadFilter } from '../query';
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

      expect(result).toBe('source=logs | sort _id | head 100 ');
    });

    it('should handle complex query', () => {
      const query = 'source=logs | where status="error" | stats count by host';
      const result = addHeadFilter(query);

      expect(result).toBe(
        'source=logs | where status="error" | stats count by host | sort _id | head 100 '
      );
    });

    it('should handle empty query', () => {
      const result = addHeadFilter('');
      expect(result).toBe(' | sort _id | head 100 ');
    });
  });

  describe('executePPLQueryWithHeadFilter', () => {
    it('should call callOpenSearchCluster with correct parameters', async () => {
      const mockResponse = {
        schema: [{ name: 'FlightNum', type: 'string' }],
        datarows: [['8EY59TH']],
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
            query: 'source=logs | sort _id | head 100 ',
          }),
        },
      });

      expect(result).toEqual(mockResponse);
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
