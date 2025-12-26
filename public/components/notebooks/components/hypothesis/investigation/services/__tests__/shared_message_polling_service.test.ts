/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedMessagePollingService } from '../shared_message_polling_service';
import { getFinalMessage } from '../../utils';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/http/http_service.mock';
import { CoreStart } from '../../../../../../../../../../src/core/public';

// Mock dependencies
jest.mock('../../utils', () => ({
  getFinalMessage: jest.fn(),
}));

// Mock timer functions
jest.useFakeTimers();

describe('SharedMessagePollingService', () => {
  let service: SharedMessagePollingService;
  let mockHttp: CoreStart['http'];
  let mockDataSourceId: string;
  let mockMessageId: string;
  let mockMemoryContainerId: string;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset the singleton instance
    (SharedMessagePollingService as any).instance = undefined;

    // Setup mock data
    mockHttp = httpServiceMock.createStartContract();
    mockDataSourceId = 'test-datasource-id';
    mockMessageId = 'test-message-id';
    mockMemoryContainerId = 'test-memory-container-id';

    // Mock getFinalMessage to return null initially (polling continues)
    (getFinalMessage as jest.Mock).mockResolvedValue(null);

    // Create service instance
    service = SharedMessagePollingService.getInstance(mockHttp);
  });

  afterEach(() => {
    // Clear all timers
    jest.clearAllTimers();
  });

  test('should return singleton instance', () => {
    const instance1 = SharedMessagePollingService.getInstance(mockHttp);
    const instance2 = SharedMessagePollingService.getInstance(mockHttp);

    expect(instance1).toBe(instance2);
  });

  test('should start polling when poll is called', () => {
    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    // Subscribe to start polling
    const subscription = observable.subscribe();

    // Advance timers to trigger the first polling
    jest.advanceTimersByTime(0);

    // Verify getFinalMessage was called with correct parameters
    expect(getFinalMessage).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      http: mockHttp,
      signal: expect.any(Object),
      dataSourceId: mockDataSourceId,
    });

    subscription.unsubscribe();
  });

  test('should return existing observable if polling is already in progress', () => {
    const observable1 = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    const observable2 = service.poll({
      memoryContainerId: 'different-container',
      messageId: 'different-message',
      dataSourceId: 'different-datasource',
    });

    expect(observable1).toBe(observable2);
  });

  test('should emit message when getFinalMessage returns a response', async () => {
    const mockResponse = 'This is the final response';
    (getFinalMessage as jest.Mock).mockResolvedValueOnce(mockResponse);

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    const emittedValues: any[] = [];
    const subscription = observable.subscribe({
      next: (value) => emittedValues.push(value),
    });

    // Advance timers to trigger polling
    jest.advanceTimersByTime(0);

    // Wait for async operations
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    expect(emittedValues).toContain(mockResponse);

    subscription.unsubscribe();
  });

  test('should continue polling when getFinalMessage returns null', async () => {
    (getFinalMessage as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('final response');

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    const subscription = observable.subscribe();

    // First poll
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Second poll
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    // Third poll
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    // Verify getFinalMessage was called multiple times
    expect(getFinalMessage).toHaveBeenCalledTimes(3);

    subscription.unsubscribe();
  });

  test('should stop polling when message is received', async () => {
    const mockResponse = 'Final response';
    (getFinalMessage as jest.Mock).mockResolvedValueOnce(mockResponse);

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    let completed = false;
    const subscription = observable.subscribe({
      complete: () => {
        completed = true;
      },
    });

    // Trigger polling
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    // Verify polling completed
    expect(completed).toBe(true);

    subscription.unsubscribe();
  });

  test('should handle errors from getFinalMessage', async () => {
    const testError = new Error('Test error');
    (getFinalMessage as jest.Mock)
      .mockRejectedValueOnce(testError)
      .mockRejectedValueOnce(testError)
      .mockRejectedValueOnce(testError)
      .mockRejectedValueOnce(testError)
      .mockRejectedValueOnce(testError);

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    let receivedError: Error | undefined;
    const subscription = observable.subscribe({
      error: (error) => {
        receivedError = error as Error;
      },
    });

    // Trigger polling multiple times to reach error threshold
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(i === 0 ? 0 : 5000);
      await Promise.resolve();
    }

    // Wait for error to propagate
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    expect(receivedError).toBeTruthy();
    expect(receivedError!.message).toContain('Polling failed after');

    subscription.unsubscribe();
  });

  test('should emit null and continue polling on individual errors', async () => {
    const testError = new Error('Test error');
    (getFinalMessage as jest.Mock)
      .mockRejectedValueOnce(testError)
      .mockResolvedValueOnce('final response');

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    const emittedValues: any[] = [];
    const subscription = observable.subscribe({
      next: (value) => emittedValues.push(value),
    });

    // First poll (error, should emit null)
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Second poll (success)
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();

    expect(emittedValues).toContain(null);
    expect(emittedValues).toContain('final response');

    subscription.unsubscribe();
  });

  test('should cleanup when all subscribers unsubscribe', async () => {
    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    const subscription1 = observable.subscribe();
    const subscription2 = observable.subscribe();

    // Unsubscribe all
    subscription1.unsubscribe();
    subscription2.unsubscribe();

    // Advance timers to trigger finalize
    jest.runAllTimers();
    await Promise.resolve();

    // Verify a new poll creates a new observable
    (getFinalMessage as jest.Mock).mockClear();

    // Reset the singleton to simulate cleanup
    (SharedMessagePollingService as any).instance = undefined;
    const newService = SharedMessagePollingService.getInstance(mockHttp);

    const newObservable = newService.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    const newSubscription = newObservable.subscribe();
    jest.advanceTimersByTime(0);

    expect(getFinalMessage).toHaveBeenCalled();

    newSubscription.unsubscribe();
  });

  test('should use default pollInterval if not provided', async () => {
    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    const subscription = observable.subscribe();

    // Advance timers to trigger the first polling
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(getFinalMessage).toHaveBeenCalledTimes(1);

    // Second poll after 5000ms (default interval)
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    await Promise.resolve();
    expect(getFinalMessage).toHaveBeenCalledTimes(2);

    subscription.unsubscribe();
  });

  test('should work without dataSourceId', () => {
    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
    });

    const subscription = observable.subscribe();

    // Advance timers to trigger the first polling
    jest.advanceTimersByTime(0);

    // Verify getFinalMessage was called without dataSourceId
    expect(getFinalMessage).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      http: mockHttp,
      signal: expect.any(Object),
      dataSourceId: undefined,
    });

    subscription.unsubscribe();
  });

  test('should share replay the last emitted value to new subscribers', async () => {
    const mockResponse = 'Shared response';
    (getFinalMessage as jest.Mock).mockResolvedValue(mockResponse);

    const observable = service.poll({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });

    // First subscriber
    const emittedValues1: any[] = [];
    const subscription1 = observable.subscribe({
      next: (value) => emittedValues1.push(value),
    });

    // Trigger polling
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Second subscriber should receive the replayed value
    const emittedValues2: any[] = [];
    const subscription2 = observable.subscribe({
      next: (value) => emittedValues2.push(value),
    });

    await Promise.resolve();

    expect(emittedValues1).toContain(mockResponse);
    expect(emittedValues2).toContain(mockResponse);

    subscription1.unsubscribe();
    subscription2.unsubscribe();
  });
});
