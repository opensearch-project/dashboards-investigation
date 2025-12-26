/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject } from 'rxjs';
import { PERAgentMessageService } from '../per_agent_message_service';
import { SharedMessagePollingService } from '../shared_message_polling_service';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/http/http_service.mock';
import { CoreStart } from '../../../../../../../../../../src/core/public';

// Mock SharedMessagePollingService
jest.mock('../shared_message_polling_service');

describe('PERAgentMessageService', () => {
  let service: PERAgentMessageService;
  let mockHttp: CoreStart['http'];
  let mockDataSourceId: string;
  let mockMessageId: string;
  let mockMemoryContainerId: string;
  let mockSharedPollingService: jest.Mocked<SharedMessagePollingService>;
  let mockPollingSubject: Subject<unknown>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock data
    mockHttp = httpServiceMock.createStartContract();
    mockDataSourceId = 'test-datasource-id';
    mockMessageId = 'test-message-id';
    mockMemoryContainerId = 'test-memory-container-id';

    // Create a subject to control polling emissions
    mockPollingSubject = new Subject<unknown>();

    // Setup mock SharedMessagePollingService
    mockSharedPollingService = ({
      poll: jest.fn().mockReturnValue(mockPollingSubject.asObservable()),
    } as unknown) as jest.Mocked<SharedMessagePollingService>;

    (SharedMessagePollingService.getInstance as jest.Mock).mockReturnValue(
      mockSharedPollingService
    );

    // Create service instance
    service = new PERAgentMessageService(mockHttp, mockMemoryContainerId);
  });

  afterEach(() => {
    // Clean up
    service.stop();
    mockPollingSubject.complete();
  });

  test('should initialize with null message', () => {
    expect(service.getMessageValue()).toBeNull();
  });

  test('should call SharedMessagePollingService.getInstance with http', () => {
    expect(SharedMessagePollingService.getInstance).toHaveBeenCalledWith(mockHttp);
  });

  test('should setup message polling correctly', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Verify SharedMessagePollingService.poll was called with correct parameters
    expect(mockSharedPollingService.poll).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });
  });

  test('should update message value when new message is received from polling', () => {
    const mockMessage = { response: 'test response' };

    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Emit a message from the polling observable
    mockPollingSubject.next(mockMessage);

    // Verify message value is updated
    expect(service.getMessageValue()).toEqual(mockMessage);
  });

  test('should not create new subscription if one already exists and is not closed', () => {
    // Setup the service once
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Reset the mock call count
    mockSharedPollingService.poll.mockClear();

    // Setup again with different message ID
    service.setup({
      messageId: 'another-message-id',
      dataSourceId: mockDataSourceId,
    });

    // Verify poll was not called again
    expect(mockSharedPollingService.poll).not.toHaveBeenCalled();
  });

  test('should stop polling and reset message when stop is called', () => {
    const mockMessage = { response: 'test response' };

    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Emit a message
    mockPollingSubject.next(mockMessage);

    // Verify message is set
    expect(service.getMessageValue()).toEqual(mockMessage);

    // Stop the service
    service.stop();

    // Verify message is reset to null
    expect(service.getMessageValue()).toBeNull();
  });

  test('should stop and reset message when polling emits an error', () => {
    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Emit an error from the polling observable
    mockPollingSubject.error(new Error('Polling error'));

    // Verify message is reset to null
    expect(service.getMessageValue()).toBeNull();
  });

  test('should allow new setup after stop is called', () => {
    // Setup the service once
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Stop the service
    service.stop();

    // Reset the mock call count
    mockSharedPollingService.poll.mockClear();

    // Setup again
    service.setup({
      messageId: 'another-message-id',
      dataSourceId: mockDataSourceId,
    });

    // Verify poll was called again
    expect(mockSharedPollingService.poll).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: 'another-message-id',
      dataSourceId: mockDataSourceId,
      pollInterval: 5000,
    });
  });

  test('should handle multiple message emissions', () => {
    const mockMessage1 = { response: 'response 1' };
    const mockMessage2 = { response: 'response 2' };
    const mockMessage3 = { response: 'response 3' };

    // Setup the service
    service.setup({
      messageId: mockMessageId,
      dataSourceId: mockDataSourceId,
    });

    // Emit multiple messages
    mockPollingSubject.next(mockMessage1);
    expect(service.getMessageValue()).toEqual(mockMessage1);

    mockPollingSubject.next(mockMessage2);
    expect(service.getMessageValue()).toEqual(mockMessage2);

    mockPollingSubject.next(mockMessage3);
    expect(service.getMessageValue()).toEqual(mockMessage3);
  });

  test('should work without dataSourceId', () => {
    // Setup the service without dataSourceId
    service.setup({
      messageId: mockMessageId,
    });

    // Verify SharedMessagePollingService.poll was called with undefined dataSourceId
    expect(mockSharedPollingService.poll).toHaveBeenCalledWith({
      memoryContainerId: mockMemoryContainerId,
      messageId: mockMessageId,
      dataSourceId: undefined,
      pollInterval: 5000,
    });
  });
});
