/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { errors } from '@opensearch-project/opensearch';
import { getOpenSearchClientTransport, handleError } from '../utils';
import { coreMock, httpServerMock } from '../../../../../src/core/server/mocks';

describe('getOpenSearchClientTransport', () => {
  it('should return current user opensearch transport', async () => {
    const core = coreMock.createRequestHandlerContext();

    expect(
      await getOpenSearchClientTransport({
        context: { core },
        request: httpServerMock.createOpenSearchDashboardsRequest(),
      })
    ).toBe(core.opensearch.client.asCurrentUser.transport);
  });
  it('should data source id related opensearch transport', async () => {
    const transportMock = {};
    const core = coreMock.createRequestHandlerContext();
    const context = {
      core,
      dataSource: {
        opensearch: {
          getClient: async (_dataSourceId: string) => ({
            transport: transportMock,
          }),
        },
      },
    };

    expect(
      await getOpenSearchClientTransport({
        context,
        dataSourceId: 'foo',
        request: httpServerMock.createOpenSearchDashboardsRequest(),
      })
    ).toBe(transportMock);
  });
});

describe('handleError', () => {
  let mockResponse: any;
  let mockLogger: any;

  beforeEach(() => {
    mockResponse = {
      customError: jest.fn((params) => params),
      internalError: jest.fn(() => ({ statusCode: 500 })),
    };

    mockLogger = {
      error: jest.fn(),
    };
  });

  it('should handle NoLivingConnectionsError', () => {
    const error = new errors.NoLivingConnectionsError('No living connections', {
      warnings: [],
      meta: {} as any,
    });

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: 'No living connections',
      statusCode: 400,
    });
  });

  it('should handle ConnectionError', () => {
    const error = new errors.ConnectionError('Connection failed', {
      warnings: [],
      meta: {} as any,
    });

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: 'Connection failed',
      statusCode: 400,
    });
  });

  it('should handle HTTP errors with statusCode', () => {
    const error = { statusCode: 404, message: 'Not found' };

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: {
        message: 'Unable to process the request, please try again later.',
      },
      statusCode: 404,
    });
  });

  it('should handle HTTP errors with status (instead of statusCode)', () => {
    const error = { status: 500, message: 'Internal error' };

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: {
        message: 'Unable to process the request, please try again later.',
      },
      statusCode: 500,
    });
  });

  it('should prefer statusCode over status when both are present', () => {
    const error = { statusCode: 400, status: 500, message: 'Error' };

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: {
        message: 'Unable to process the request, please try again later.',
      },
      statusCode: 400,
    });
  });

  it('should return internalError for unhandled errors', () => {
    const error = { message: 'Unknown error' };

    handleError(error, mockResponse, mockLogger);

    expect(mockResponse.internalError).toHaveBeenCalled();
  });

  it('should log error message', () => {
    const error = { statusCode: 500, message: 'Test error message' };

    handleError(error, mockResponse, mockLogger);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Investigation error happens')
    );
  });
});
