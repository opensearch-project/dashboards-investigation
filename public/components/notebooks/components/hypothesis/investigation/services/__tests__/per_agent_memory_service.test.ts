/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PERAgentMemoryService } from '../per_agent_memory_service';
import { getAllMessagesBySessionIdAndMemoryId } from '../../utils';
import { BehaviorSubject } from 'rxjs';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/http/http_service.mock';
import { CoreStart } from '../../../../../../../../../../src/core/public';

// Mock dependencies
jest.mock('../../utils', () => ({
  getAllMessagesBySessionIdAndMemoryId: jest.fn(),
}));

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {
    aborted: false,
    onabort: null,
    reason: undefined,
    throwIfAborted: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  },
  abort: jest.fn(),
}));

// Mock messages for tests
const mockMessages = [
  { id: 'msg1', content: 'Message 1' },
  { id: 'msg2', content: 'Message 2' },
];

describe('PERAgentMemoryService', () => {
  let service: PERAgentMemoryService;
  let mockMemoryId$: BehaviorSubject<string>;
  let mockShouldPolling: jest.Mock;
  let mockHttp: CoreStart['http'];
  let mockDataSourceId: string;
  let mockMemoryId: string;
  let mockMemoryContainerId: string;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock data
    mockHttp = httpServiceMock.createStartContract();
    mockDataSourceId = 'test-datasource-id';
    mockMemoryId = 'memory-id-123';
    mockMemoryContainerId = 'memory-container-id-456';

    // Create a real BehaviorSubject for memory ID
    mockMemoryId$ = new BehaviorSubject<string>(mockMemoryId);
    mockShouldPolling = jest.fn().mockReturnValue(true);

    // Mock getAllMessagesBySessionIdAndMemoryId to return messages
    (getAllMessagesBySessionIdAndMemoryId as jest.Mock).mockResolvedValue(mockMessages);

    // Create service instance
    service = new PERAgentMemoryService(
      mockHttp,
      mockMemoryId$,
      mockShouldPolling,
      mockMemoryContainerId
    );
    service.setup({
      dataSourceId: mockDataSourceId,
    });
  });

  afterEach(() => {
    // Clean up
    service.stop();
  });

  test('should initialize with empty messages', () => {
    let receivedMessages: any[] = [];
    const subscription = service.getMessages$().subscribe((msgs) => {
      receivedMessages = msgs;
    });

    expect(receivedMessages).toEqual([]);
    subscription.unsubscribe();
  });

  test('should setup with dataSourceId', async () => {
    // Setup is already done in beforeEach
    // We can't directly test private fields, but we can test the behavior
    // that depends on these fields being set correctly

    // Create a promise to wait for messages to be updated
    const messagesUpdated = new Promise<void>((resolve) => {
      const subscription = service.getMessages$().subscribe((msgs) => {
        if (msgs.length > 0) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });

    // Start polling to verify the service works with the dataSourceId
    service.startPolling();

    // Wait for messages to be updated
    await messagesUpdated;

    // Verify that getAllMessagesBySessionIdAndMemoryId was called with the correct dataSourceId
    expect(getAllMessagesBySessionIdAndMemoryId).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSourceId: mockDataSourceId,
      })
    );

    // Verify that the http client is being used
    expect(getAllMessagesBySessionIdAndMemoryId).toHaveBeenCalledWith(
      expect.objectContaining({
        http: mockHttp,
      })
    );
  });

  test('should start polling and subscribe to memory ID observable', async () => {
    // Service is already set up in beforeEach

    // Mock getAllMessagesBySessionIdAndMemoryId to resolve with mock messages
    (getAllMessagesBySessionIdAndMemoryId as jest.Mock).mockResolvedValue(mockMessages);

    // Create a promise to wait for polling state to be updated
    const pollingStateUpdated = new Promise<void>((resolve) => {
      const subscription = service.getPollingState$().subscribe((state) => {
        if (state === true) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });

    // Start polling
    service.startPolling();

    // Wait for polling state to be updated
    await pollingStateUpdated;

    // Verify polling state
    let pollingState = false;
    const subscription = service.getPollingState$().subscribe((state) => {
      pollingState = state;
    });

    expect(pollingState).toBe(true);
    subscription.unsubscribe();
  });

  test('should update messages when polling returns new messages', async () => {
    // Service is already set up in beforeEach

    // Mock getAllMessagesBySessionIdAndMemoryId to resolve with mock messages
    (getAllMessagesBySessionIdAndMemoryId as jest.Mock).mockResolvedValue(mockMessages);

    // Create a promise to wait for messages to be updated
    const messagesUpdated = new Promise<void>((resolve) => {
      const subscription = service.getMessages$().subscribe((msgs) => {
        if (msgs.length > 0) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });

    // Start polling
    service.startPolling();

    // Wait for messages to be updated
    await messagesUpdated;

    // Verify messages are updated
    let receivedMessages: any[] = [];
    const subscription = service.getMessages$().subscribe((msgs) => {
      receivedMessages = msgs;
    });

    expect(receivedMessages).toEqual(mockMessages);
    subscription.unsubscribe();
  });

  test('should have polling state false when shouldContinuePolling returns false', async () => {
    // Create a new service instance with mockShouldPolling that returns false
    mockShouldPolling = jest.fn().mockReturnValue(false);
    service = new PERAgentMemoryService(
      mockHttp,
      mockMemoryId$,
      mockShouldPolling,
      mockMemoryContainerId
    );

    // Setup the service
    service.setup({
      dataSourceId: mockDataSourceId,
    });

    // Mock getAllMessagesBySessionIdAndMemoryId to resolve with mock messages
    (getAllMessagesBySessionIdAndMemoryId as jest.Mock).mockResolvedValue(mockMessages);

    // Create a promise to wait for messages to be updated
    const messagesUpdated = new Promise<void>((resolve) => {
      const subscription = service.getMessages$().subscribe((msgs) => {
        if (msgs.length > 0) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });

    // Start polling
    service.startPolling();

    // Wait for messages to be updated
    await messagesUpdated;

    // Verify shouldContinuePolling was called
    expect(mockShouldPolling).toHaveBeenCalled();

    // Verify polling state
    let pollingStateValue = true;
    const subscription = service.getPollingState$().subscribe((state) => {
      pollingStateValue = state;
    });

    expect(pollingStateValue).toBe(false);
    subscription.unsubscribe();
  });

  test('should not start polling if already polling', () => {
    // Setup the service and start polling once
    service.startPolling();

    // Create a spy on AbortController constructor
    const abortControllerSpy = jest.spyOn(global, 'AbortController');

    // Reset the spy count
    abortControllerSpy.mockClear();

    // Try to start polling again
    service.startPolling();

    // Verify AbortController was not created again
    expect(abortControllerSpy).not.toHaveBeenCalled();
  });

  test('should stop polling when stop is called', () => {
    // Service is already set up in beforeEach

    // Start polling to create an abort controller internally
    service.startPolling();

    // Get the mock AbortController instance
    const mockAbortController = (global.AbortController as jest.Mock).mock.results[0].value;

    // Create a spy on the abort method of the instance
    const abortSpy = jest.spyOn(mockAbortController, 'abort');

    // Stop polling
    service.stop('Test stop');

    // Verify abort was called
    expect(abortSpy).toHaveBeenCalledWith('Test stop');

    // Try to start polling again to verify the abort controller was cleared
    const abortControllerSpy = jest.spyOn(global, 'AbortController');
    abortControllerSpy.mockClear();

    service.startPolling();

    // If the abort controller was properly cleared, a new one should be created
    expect(abortControllerSpy).toHaveBeenCalled();
  });

  test('should clear messages when stop is called', () => {
    // Service is already set up in beforeEach

    // First, add some messages to the service
    (getAllMessagesBySessionIdAndMemoryId as jest.Mock).mockResolvedValue(mockMessages);

    // Create a promise to wait for messages to be updated
    const messagesUpdated = new Promise<void>((resolve) => {
      const subscription = service.getMessages$().subscribe((msgs) => {
        if (msgs.length > 0) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });

    // Start polling to populate messages
    service.startPolling();

    // Wait for messages to be updated
    return messagesUpdated.then(() => {
      // Verify messages are populated
      let messagesBeforeStop: any[] = [];
      const subscriptionBefore = service.getMessages$().subscribe((msgs) => {
        messagesBeforeStop = msgs;
      });
      expect(messagesBeforeStop).toEqual(mockMessages);
      subscriptionBefore.unsubscribe();

      // Stop the service
      service.stop('Test stop');

      // Verify messages are cleared
      let messagesAfterStop: any[] = [];
      const subscriptionAfter = service.getMessages$().subscribe((msgs) => {
        messagesAfterStop = msgs;
      });
      expect(messagesAfterStop).toEqual([]);
      subscriptionAfter.unsubscribe();
    });
  });
});
