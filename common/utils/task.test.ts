/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  isStateCompletedOrFailed,
  extractExecutorMemoryId,
  extractParentInteractionId,
  extractMemoryId,
  extractCompletedResponse,
  extractFailedErrorMessage,
} from './task';

describe('task utils', () => {
  describe('isStateCompletedOrFailed', () => {
    it('should return true for COMPLETED state', () => {
      expect(isStateCompletedOrFailed('COMPLETED')).toBe(true);
    });

    it('should return true for FAILED state', () => {
      expect(isStateCompletedOrFailed('FAILED')).toBe(true);
    });

    it('should return false for other states', () => {
      expect(isStateCompletedOrFailed('RUNNING')).toBe(false);
      expect(isStateCompletedOrFailed('PENDING')).toBe(false);
      expect(isStateCompletedOrFailed('CREATED')).toBe(false);
      expect(isStateCompletedOrFailed('')).toBe(false);
    });
  });

  describe('extractExecutorMemoryId', () => {
    it('should extract executor_agent_memory_id from response', () => {
      const task = {
        response: {
          executor_agent_memory_id: 'memory-123',
        },
      };
      expect(extractExecutorMemoryId(task)).toBe('memory-123');
    });

    it('should extract from inference_results output', () => {
      const task = {
        response: {
          inference_results: [
            {
              output: [
                { name: 'executor_agent_memory_id', result: 'memory-456' },
                { name: 'other', result: 'value' },
              ],
            },
          ],
        },
      };
      expect(extractExecutorMemoryId(task)).toBe('memory-456');
    });

    it('should prioritize direct response property', () => {
      const task = {
        response: {
          executor_agent_memory_id: 'memory-123',
          inference_results: [
            {
              output: [{ name: 'executor_agent_memory_id', result: 'memory-456' }],
            },
          ],
        },
      };
      expect(extractExecutorMemoryId(task)).toBe('memory-123');
    });

    it('should return undefined if not found', () => {
      const task = {
        response: {},
      };
      expect(extractExecutorMemoryId(task)).toBeUndefined();
    });

    it('should handle null or undefined task', () => {
      expect(extractExecutorMemoryId(null)).toBeUndefined();
      expect(extractExecutorMemoryId(undefined)).toBeUndefined();
    });
  });

  describe('extractParentInteractionId', () => {
    it('should extract parent_interaction_id from response', () => {
      const task = {
        response: {
          parent_interaction_id: 'interaction-123',
        },
      };
      expect(extractParentInteractionId(task)).toBe('interaction-123');
    });

    it('should return undefined if not present', () => {
      const task = {
        response: {},
      };
      expect(extractParentInteractionId(task)).toBeUndefined();
    });
  });

  describe('extractMemoryId', () => {
    it('should extract memory_id from response', () => {
      const task = {
        response: {
          memory_id: 'mem-789',
        },
      };
      expect(extractMemoryId(task)).toBe('mem-789');
    });

    it('should return undefined if not present', () => {
      const task = {
        response: {},
      };
      expect(extractMemoryId(task)).toBeUndefined();
    });
  });

  describe('extractCompletedResponse', () => {
    it('should extract response from inference_results output', () => {
      const task = {
        response: {
          inference_results: [
            {
              output: [
                {
                  name: 'response',
                  dataAsMap: {
                    response: 'Task completed successfully',
                  },
                },
              ],
            },
          ],
        },
      };
      expect(extractCompletedResponse(task)).toBe('Task completed successfully');
    });

    it('should return undefined if inference_results is missing', () => {
      const task = {
        response: {},
      };
      expect(extractCompletedResponse(task)).toBeUndefined();
    });

    it('should handle when response output not found', () => {
      const task = {
        response: {
          inference_results: [
            {
              output: [
                {
                  name: 'other',
                  dataAsMap: {
                    response: 'some value',
                  },
                },
              ],
            },
          ],
        },
      };
      // The function will throw an error when trying to access dataAsMap on undefined
      expect(() => extractCompletedResponse(task)).toThrow();
    });
  });

  describe('extractFailedErrorMessage', () => {
    it('should extract error_message from response', () => {
      const task = {
        response: {
          error_message: 'Task execution failed',
        },
      };
      expect(extractFailedErrorMessage(task)).toBe('Task execution failed');
    });

    it('should return undefined if error_message not present', () => {
      const task = {
        response: {},
      };
      expect(extractFailedErrorMessage(task)).toBeUndefined();
    });
  });
});
