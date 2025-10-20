/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addSamplingFilter,
  removeRandomScoreFromResponse,
  jsonArrayToTsv,
  flattenObject,
  executePPLQuery,
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

  describe('executePPLQuery', () => {
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

      await executePPLQuery(params, true);

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

      await executePPLQuery(params, true);

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

      await executePPLQuery(params, true);

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

      await executePPLQuery(params, true);

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

    it('should not apply sampling when notebookType is classic', async () => {
      const queryResponse = { schema: [], datarows: [] };
      mockCallOpenSearchCluster.mockResolvedValueOnce(queryResponse);

      const params = {
        http: mockHttp as any,
        dataSourceId: 'test-datasource',
        query: 'source=logs',
      };

      await executePPLQuery(params, false);

      expect(mockCallOpenSearchCluster).toHaveBeenCalledTimes(1);
      expect(mockCallOpenSearchCluster).toHaveBeenCalledWith({
        http: mockHttp,
        dataSourceId: 'test-datasource',
        request: {
          path: '/_plugins/_ppl',
          method: 'POST',
          body: JSON.stringify({ query: 'source=logs' }),
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

  describe('flattenObject', () => {
    it('should flatten simple object', () => {
      const obj = { id: 1, name: 'John' };
      const result = flattenObject(obj);
      expect(result).toEqual({ id: 1, name: 'John' });
    });

    it('should flatten nested objects with dot notation', () => {
      const obj = { user: { name: 'John', details: { age: 30 } } };
      const result = flattenObject(obj);
      expect(result).toEqual({ 'user.name': 'John', 'user.details.age': 30 });
    });

    it('should convert arrays to JSON strings', () => {
      const obj = { tags: ['admin', 'user'], scores: [95, 87] };
      const result = flattenObject(obj);
      expect(result).toEqual({ tags: '["admin","user"]', scores: '[95,87]' });
    });

    it('should handle null values as primitives', () => {
      const obj = { id: 1, value: null };
      const result = flattenObject(obj);
      expect(result).toEqual({ id: 1, value: null });
    });

    it('should use prefix when provided', () => {
      const obj = { name: 'John', age: 30 };
      const result = flattenObject(obj, 'user');
      expect(result).toEqual({ 'user.name': 'John', 'user.age': 30 });
    });
  });

  describe('jsonArrayToTsv', () => {
    it('should return empty string for empty array', () => {
      expect(jsonArrayToTsv([])).toBe('');
    });

    it('should convert simple objects to TSV', () => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = jsonArrayToTsv(data);
      expect(result).toBe('id\tname\n1\tJohn\n2\tJane');
    });

    it('should flatten nested objects', () => {
      const data = [
        { id: 1, user: { name: 'John', age: 30 } },
        { id: 2, user: { name: 'Jane' } },
      ];
      const result = jsonArrayToTsv(data);
      expect(result).toBe('id\tuser.name\tuser.age\n1\tJohn\t30\n2\tJane\t');
    });

    it('should handle arrays by converting to JSON strings', () => {
      const data = [
        { id: 1, tags: ['admin', 'user'] },
        { id: 2, tags: ['guest'] },
      ];
      const result = jsonArrayToTsv(data);
      expect(result).toBe('id\ttags\n1\t["admin","user"]\n2\t["guest"]');
    });

    it('should handle mixed object structures', () => {
      const data = [
        { id: 1, user: { name: 'John' }, active: true },
        { id: 2, metadata: { created: '2023-01-01' }, active: false },
      ];
      const result = jsonArrayToTsv(data);
      expect(result).toBe(
        'id\tuser.name\tactive\tmetadata.created\n1\tJohn\ttrue\t\n2\t\tfalse\t2023-01-01'
      );
    });
  });
});
