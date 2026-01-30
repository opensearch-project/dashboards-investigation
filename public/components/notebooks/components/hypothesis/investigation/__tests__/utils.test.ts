/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getMemoryPermission } from '../utils';
import * as mlCommonsApis from '../../../../../../utils/ml_commons_apis';

jest.mock('../../../../../../utils/ml_commons_apis');

const mockExecuteMLCommonsAgenticMessage = mlCommonsApis.executeMLCommonsAgenticMessage as jest.Mock;

const mockHttp = {
  post: jest.fn(),
  get: jest.fn(),
};

describe('getMemoryPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultOptions = {
    http: mockHttp as any,
    memoryContainerId: 'test-container',
    messageId: 'test-message-id',
  };

  it('should return true when hits.total equals 1', async () => {
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue({
      hits: {
        total: 1,
        hits: [],
      },
    });

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(mockExecuteMLCommonsAgenticMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        ...defaultOptions,
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should return false when hits.total does not equal 1', async () => {
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue({
      hits: {
        total: 0,
        hits: [],
      },
    });

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result).toBe(false);
  });

  it('should return false when response is undefined', async () => {
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue(undefined);

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result).toBe(false);
  });

  it('should return false when hits is undefined', async () => {
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue({});

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result).toBe(false);
  });

  it('should return false when API throws an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockExecuteMLCommonsAgenticMessage.mockRejectedValue(new Error('API Error'));

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should abort the request after 5 seconds timeout', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let capturedSignal: AbortSignal | undefined;

    mockExecuteMLCommonsAgenticMessage.mockImplementation(async (options) => {
      capturedSignal = options.signal;
      // Simulate a long-running request
      await new Promise((_, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const resultPromise = getMemoryPermission(defaultOptions);

    // Fast-forward 5 seconds to trigger timeout
    jest.advanceTimersByTime(5000);

    const result = await resultPromise;

    expect(result).toBe(false);
    expect(capturedSignal?.aborted).toBe(true);
    consoleSpy.mockRestore();
  });

  it('should clear timeout after successful response', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue({
      hits: {
        total: 1,
        hits: [],
      },
    });

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    await resultPromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should clear timeout after error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    mockExecuteMLCommonsAgenticMessage.mockRejectedValue(new Error('API Error'));

    const resultPromise = getMemoryPermission(defaultOptions);
    jest.runAllTimers();
    await resultPromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should pass through additional options to the API call', async () => {
    mockExecuteMLCommonsAgenticMessage.mockResolvedValue({
      hits: {
        total: 1,
        hits: [],
      },
    });

    const optionsWithDataSource = {
      ...defaultOptions,
      dataSourceId: 'test-datasource',
    };

    const resultPromise = getMemoryPermission(optionsWithDataSource);
    jest.runAllTimers();
    await resultPromise;

    expect(mockExecuteMLCommonsAgenticMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSourceId: 'test-datasource',
      })
    );
  });
});
