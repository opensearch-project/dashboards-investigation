/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MLService } from '../ml_service';
import { OPENSEARCH_ML_COMMONS_API } from '../../../common/constants/ml_commons';

describe('MLService', () => {
  let mlService: MLService;
  let mockTransport: any;
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = { body: { test: 'response' } };
    mockTransport = {
      request: jest.fn().mockResolvedValue(mockResponse),
    };
    mlService = new MLService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTask', () => {
    it('should call transport.request with correct parameters', async () => {
      const taskId = 'test-task-id';
      const expectedPath = OPENSEARCH_ML_COMMONS_API.singleTask.replace('{taskId}', taskId);

      await mlService.getTask({ transport: mockTransport, taskId });

      expect(mockTransport.request).toHaveBeenCalledWith({
        path: expectedPath,
        method: 'GET',
      });
    });

    it('should return the response body', async () => {
      const taskId = 'test-task-id';
      const result = await mlService.getTask({ transport: mockTransport, taskId });

      expect(result).toEqual(mockResponse.body);
    });

    it('should handle errors properly', async () => {
      const taskId = 'test-task-id';
      const error = new Error('Test error');
      mockTransport.request.mockRejectedValueOnce(error);

      await expect(mlService.getTask({ transport: mockTransport, taskId })).rejects.toThrow(error);
    });
  });

  describe('executeAgent', () => {
    const mockParameters = {
      question: 'test question',
      context: 'test context',
    };

    it('should call transport.request with correct parameters for sync execution', async () => {
      const agentId = 'test-agent-id';
      const expectedPath = OPENSEARCH_ML_COMMONS_API.agentExecute.replace('{agentId}', agentId);

      await mlService.executeAgent({
        transport: mockTransport,
        agentId,
        parameters: mockParameters,
      });

      expect(mockTransport.request).toHaveBeenCalledWith({
        path: expectedPath,
        method: 'POST',
        querystring: undefined,
        body: {
          parameters: mockParameters,
        },
      });
    });

    it('should call transport.request with async parameter when async is true', async () => {
      const agentId = 'test-agent-id';
      const expectedPath = OPENSEARCH_ML_COMMONS_API.agentExecute.replace('{agentId}', agentId);

      await mlService.executeAgent({
        transport: mockTransport,
        agentId,
        async: true,
        parameters: mockParameters,
      });

      expect(mockTransport.request).toHaveBeenCalledWith({
        path: expectedPath,
        method: 'POST',
        querystring: 'async=true',
        body: {
          parameters: mockParameters,
        },
      });
    });

    it('should handle all parameter options correctly', async () => {
      const agentId = 'test-agent-id';
      const fullParameters = {
        question: 'test question',
        planner_prompt_template: 'test planner prompt',
        planner_with_history_template: 'test history template',
        reflect_prompt_template: 'test reflect prompt',
        context: 'test context',
        executor_system_prompt: 'test executor prompt',
        memory_id: 'test-memory-id',
      };

      await mlService.executeAgent({
        transport: mockTransport,
        agentId,
        parameters: fullParameters,
      });

      expect(mockTransport.request).toHaveBeenCalledWith({
        path: expect.any(String),
        method: 'POST',
        querystring: undefined,
        body: {
          parameters: fullParameters,
        },
      });
    });

    it('should return the response directly', async () => {
      const agentId = 'test-agent-id';
      const result = await mlService.executeAgent({
        transport: mockTransport,
        agentId,
        parameters: mockParameters,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle errors properly', async () => {
      const agentId = 'test-agent-id';
      const error = new Error('Test error');
      mockTransport.request.mockRejectedValueOnce(error);

      await expect(
        mlService.executeAgent({ transport: mockTransport, agentId, parameters: mockParameters })
      ).rejects.toThrow(error);
    });
  });

  describe('getMLConfig', () => {
    it('should call transport.request with correct parameters', async () => {
      const configName = 'test-config';
      const expectedPath = OPENSEARCH_ML_COMMONS_API.singleConfig.replace(
        '{configName}',
        configName
      );

      await mlService.getMLConfig({ transport: mockTransport, configName });

      expect(mockTransport.request).toHaveBeenCalledWith({
        path: expectedPath,
        method: 'GET',
      });
    });

    it('should return the response body', async () => {
      const configName = 'test-config';
      const result = await mlService.getMLConfig({ transport: mockTransport, configName });

      expect(result).toEqual(mockResponse.body);
    });

    it('should handle errors properly', async () => {
      const configName = 'test-config';
      const error = new Error('Test error');
      mockTransport.request.mockRejectedValueOnce(error);

      await expect(mlService.getMLConfig({ transport: mockTransport, configName })).rejects.toThrow(
        error
      );
    });
  });
});
