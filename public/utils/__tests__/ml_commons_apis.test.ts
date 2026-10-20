/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeMLCommonsAgent, getMLCommonsConfig } from '../ml_commons_apis';
import { OPENSEARCH_ML_COMMONS_API } from '../../../common/constants/ml_commons';

// Mock the CoreStart http service
const mockHttp = {
  post: jest.fn(),
  get: jest.fn(),
};

// Mock AbortSignal
const mockSignal = new AbortController().signal;

describe('ML Commons APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeMLCommonsAgent', () => {
    it('should call http.post with all parameters including async', async () => {
      const mockResponse = { inference_id: 'inference-123', status: 'COMPLETED' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        signal: mockSignal,
        dataSourceId: 'test-datasource',
        agentId: 'agent-123',
        parameters: { question: 'What is OpenSearch?', context: 'search engine' },
        async: true,
      };

      const result = await executeMLCommonsAgent(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/agents/agent-123/_execute',
        query: {
          async: true,
        },
        body: JSON.stringify({
          parameters: { question: 'What is OpenSearch?', context: 'search engine' },
          dataSourceId: 'test-datasource',
        }),
        signal: mockSignal,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should work without optional parameters', async () => {
      const mockResponse = { inference_id: 'inference-456', status: 'COMPLETED' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        agentId: 'agent-456',
        parameters: { question: 'How does ML work?' },
      };

      const result = await executeMLCommonsAgent(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/agents/agent-456/_execute',
        query: {
          async: undefined,
        },
        body: JSON.stringify({
          parameters: { question: 'How does ML work?' },
          dataSourceId: undefined,
        }),
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle async=false explicitly', async () => {
      const mockResponse = { inference_id: 'inference-789', status: 'COMPLETED' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        agentId: 'agent-789',
        parameters: { input: 'test input' },
        async: false,
        dataSourceId: 'test-datasource',
      };

      const result = await executeMLCommonsAgent(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/agents/agent-789/_execute',
        query: {
          async: false,
        },
        body: JSON.stringify({
          parameters: { input: 'test input' },
          dataSourceId: 'test-datasource',
        }),
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty parameters object', async () => {
      const mockResponse = { inference_id: 'inference-empty', status: 'COMPLETED' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        agentId: 'agent-empty',
        parameters: {},
      };

      const result = await executeMLCommonsAgent(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/agents/agent-empty/_execute',
        query: {
          async: undefined,
        },
        body: JSON.stringify({
          parameters: {},
          dataSourceId: undefined,
        }),
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle complex parameters with nested objects', async () => {
      const mockResponse = { inference_id: 'inference-complex', status: 'COMPLETED' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const complexParams = {
        question: 'Complex question',
        context: JSON.stringify({ nested: { data: 'value' } }),
        options: JSON.stringify(['option1', 'option2']),
      };

      const params = {
        http: mockHttp as any,
        agentId: 'agent-complex',
        parameters: complexParams,
        async: true,
        signal: mockSignal,
      };

      const result = await executeMLCommonsAgent(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/agents/agent-complex/_execute',
        query: {
          async: true,
        },
        body: JSON.stringify({
          parameters: complexParams,
          dataSourceId: undefined,
        }),
        signal: mockSignal,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMLCommonsConfig', () => {
    it('should call callApiWithProxy with correct parameters', async () => {
      const mockResponse = { config_name: 'test-config', value: 'config-value' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        signal: mockSignal,
        configName: 'test-config',
      };

      const result = await getMLCommonsConfig(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/ml/proxy',
        query: {
          path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', 'test-config'),
          method: 'GET',
        },
        signal: mockSignal,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should work without optional signal parameter', async () => {
      const mockResponse = { config_name: 'another-config', value: 'another-value' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        configName: 'another-config',
      };

      const result = await getMLCommonsConfig(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/ml/proxy',
        query: {
          path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', 'another-config'),
          method: 'GET',
        },
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle config names with special characters', async () => {
      const mockResponse = { config_name: 'config-with-special@chars', value: 'special-value' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const specialConfigName = 'config-with-special@chars';
      const params = {
        http: mockHttp as any,
        configName: specialConfigName,
        signal: mockSignal,
      };

      const result = await getMLCommonsConfig(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/ml/proxy',
        query: {
          path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', specialConfigName),
          method: 'GET',
        },
        signal: mockSignal,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty config name', async () => {
      const mockResponse = { error: 'Config not found' };
      mockHttp.post.mockResolvedValue(mockResponse);

      const params = {
        http: mockHttp as any,
        configName: '',
      };

      const result = await getMLCommonsConfig(params);

      expect(mockHttp.post).toHaveBeenCalledWith({
        path: '/api/investigation/ml/proxy',
        query: {
          path: OPENSEARCH_ML_COMMONS_API.singleConfig.replace('{configName}', ''),
          method: 'GET',
        },
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle errors in executeMLCommonsAgent', async () => {
      const mockError = new Error('Agent execution failed');
      mockHttp.post.mockRejectedValue(mockError);

      const params = {
        http: mockHttp as any,
        agentId: 'failing-agent',
        parameters: { question: 'test' },
      };

      await expect(executeMLCommonsAgent(params)).rejects.toThrow('Agent execution failed');
    });

    it('should handle errors in getMLCommonsConfig', async () => {
      const mockError = new Error('Config not found');
      mockHttp.post.mockRejectedValue(mockError);

      const params = {
        http: mockHttp as any,
        configName: 'non-existent-config',
      };

      await expect(getMLCommonsConfig(params)).rejects.toThrow('Config not found');
    });
  });
});
