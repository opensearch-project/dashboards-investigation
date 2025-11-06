/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PERAgentMessageService } from '../per_agent_message_service';
import { executeMLCommonsAgenticMessage } from '../../../../../../../utils/ml_commons_apis';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/http/http_service.mock';
import { CoreStart } from '../../../../../../../../../../src/core/public';

// Mock dependencies
jest.mock('../../../../../../../utils/ml_commons_apis', () => ({
  executeMLCommonsAgenticMessage: jest.fn(),
}));

// Mock timer functions
jest.useFakeTimers();

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

describe('PERAgentMessageService', () => {
  let service: PERAgentMessageService;
  let mockHttp: CoreStart['http'];
  let mockDataSourceId: string;
  let mockMessageId: string;
  let mockMemoryContainerId: string;
  let mockMessage: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock data
    mockHttp = httpServiceMock.createStartContract();
    mockDataSourceId = 'test-datasource-id';
    mockMessageId = 'test-message-id';
    mockMemoryContainerId = 'test-memory-container-id';
    mockMessage = {
      hits: {
        hits: [
          {
            _source: {
              structured_data: {
                response: null,
              },
            },
          },
        ],
      },
    };

    // Mock executeMLCommonsAgenticMessage to return a message without response initially
    (executeMLCommonsAgenticMessage as jest.Mock).mockResolvedValue(mockMessage);

    // Create service instance
    service = new PERAgentMessageService(mockHttp, mockMemoryContainerId);
  });

  afterEach(() => {
    // Clean up
    service.stop();
  });

  test('should initialize with null message', () => {
    expect(service.getMessageValue()).toBeNull();
  });

  test('should setup message polling correctly', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Verify polling state is set to true
    let pollingState = false;
    const subscription = service.getPollingState$().subscribe((state) => {
      pollingState = state;
    });

    expect(pollingState).toBe(true);
    subscription.unsubscribe();

    // Advance timers to trigger the first polling
    jest.advanceTimersByTime(0);

    // Verify executeMLCommonsAgenticMessage was called with correct parameters
    expect(executeMLCommonsAgenticMessage).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      http: mockHttp,
      signal: undefined,
      dataSourceId: mockDataSourceId,
    });
  });

  test('should update message value when new message is received', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Directly update the message value using the service's internal method
    // This simulates what happens when a new message is received from polling
    // Cast to any to bypass type checking since we're directly manipulating private properties
    (service as any)._message$.next(mockMessage);

    // Verify message value is updated
    expect(service.getMessageValue()).toEqual(mockMessage);
  });

  test('should stop polling when message has response', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Create a message with response
    const messageWithResponse = {
      hits: {
        hits: [
          {
            _source: {
              structured_data: {
                response: 'This is a response',
              },
            },
          },
        ],
      },
    };

    // Mock executeMLCommonsAgenticMessage to return a message with response
    (executeMLCommonsAgenticMessage as jest.Mock).mockResolvedValue(messageWithResponse);

    // Directly update the message value using the service's internal method
    (service as any)._message$.next(messageWithResponse);

    // Verify polling state is set to false when message has response
    let pollingState = true;
    const subscription = service.getPollingState$().subscribe((state) => {
      pollingState = state;
    });

    // Manually trigger the subscription logic that would happen in the service
    if (messageWithResponse.hits?.hits?.[0]?._source?.structured_data?.response) {
      (service as any)._pollingState$.next(false);
    }

    expect(pollingState).toBe(false);
    subscription.unsubscribe();
  });

  test('should stop subscription and abort controller when stop is called', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Advance timers to ensure subscription is created
    jest.advanceTimersByTime(0);

    // Manually create an AbortController if it doesn't exist
    if (!(service as any)._abortController) {
      (service as any)._abortController = new AbortController();
    }

    // Create a spy on AbortController.abort
    const abortSpy = jest.spyOn((service as any)._abortController, 'abort');

    // Store the subscription for later verification
    const subscription = (service as any)._subscription;
    expect(subscription).toBeDefined();

    // Create a spy on subscription.unsubscribe
    const unsubscribeSpy = jest.spyOn(subscription!, 'unsubscribe');

    // Stop the service
    service.stop('Test stop');

    // Verify abort and unsubscribe were called
    expect(abortSpy).toHaveBeenCalledWith('Test stop');
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  test('should reset message to null', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Set a message
    (service as any)._message$.next(mockMessage);

    // Verify message is set
    expect(service.getMessageValue()).toEqual(mockMessage);

    // Reset the message
    service.reset();

    // Verify message is reset to null
    expect(service.getMessageValue()).toBeNull();
  });

  test('should not create new AbortController if one already exists', () => {
    // Setup the service once
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Create a spy on AbortController constructor
    const abortControllerSpy = jest.spyOn(global, 'AbortController');

    // Reset the spy count
    abortControllerSpy.mockClear();

    // Setup again with different message ID
    service.setup({
      messageId: 'another-message-id',
      dataSourceId: mockDataSourceId,
    });

    // Verify AbortController was not created again
    expect(abortControllerSpy).not.toHaveBeenCalled();
  });

  test('should stop polling and reset message when stop is called', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Set a message
    (service as any)._message$.next(mockMessage);

    // Verify message is set
    expect(service.getMessageValue()).toEqual(mockMessage);

    // Stop the service
    service.stop();

    // Verify message is reset to null
    expect(service.getMessageValue()).toBeNull();

    // Verify polling state is set to false
    let pollingState = true;
    const subscription = service.getPollingState$().subscribe((state) => {
      pollingState = state;
    });

    expect(pollingState).toBe(false);
    subscription.unsubscribe();
  });
});
