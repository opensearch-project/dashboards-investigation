/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { httpServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { registerMLConnectorRoute } from '../ml_router';
import * as utils from '../../utils';

describe('ML Router - API Path Validation', () => {
  let mockRouter: any;
  let routeHandler: any;

  beforeEach(() => {
    const mockHttpService = httpServiceMock.createSetupContract();
    mockRouter = mockHttpService.createRouter();
    registerMLConnectorRoute(mockRouter);

    // Extract the route handler from the mock router
    const routeCalls = mockRouter.post.mock.calls;
    if (routeCalls.length > 0) {
      routeHandler = routeCalls[0][1];
    }
  });

  describe('isAllowedMLPath validation', () => {
    const createMockRequest = (path: string, method: string = 'GET') => {
      return httpServerMock.createOpenSearchDashboardsRequest({
        query: {
          path,
          method,
        },
        body: {},
      });
    };

    const createMockContext = () => ({
      core: {
        opensearch: {
          client: {
            asCurrentUser: {},
          },
        },
      },
    });

    it('should allow allowed API paths', async () => {
      const allowedPaths = [
        '/_plugins/_ml/memory_containers/container-id/memories/working/_search',
        '/_plugins/_ml/memory_containers/test-container/memories/sessions',
        '/_plugins/_ml/config/config_name',
        '/_plugins/_ml/agents/agent_id',
        '/_plugins/_ml/insights/index_name/LOG_RELATED_INDEX_CHECK',
      ];

      for (const path of allowedPaths) {
        const request = createMockRequest(path);
        const response = httpServerMock.createResponseFactory();
        const context = createMockContext();

        jest.spyOn(utils, 'getOpenSearchClientTransport').mockResolvedValue({
          request: jest.fn().mockResolvedValue({
            body: { result: 'success' },
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        });

        await routeHandler(context, request, response);

        expect(response.forbidden).not.toHaveBeenCalled();
      }
    });

    it('should block disallowed request paths', async () => {
      const nonMLPaths = [
        '/_search',
        '/some-other-path',
        '/_plugins/_ml/models',
        '/_plugins/_ml/memory_containers/_search',
        '/_plugins/_ml/memory_containers//memories/working/_search',
        '/_plugins/_ml/memory_containers//memories/sessions',
        '/_plugins/_ml/memory_containers/memories/working/_search',
        '/_plugins/_ml/memory_containers/memories/sessions',
        '/_plugins/_ml/config/agent_framework_enabled/test',
        '/_plugins/_ml/agents/id/test',
        '/_plugins/_ml/insights/id/LOG_RELATED_INDEX_CHECK/test',
      ];

      for (const path of nonMLPaths) {
        const request = createMockRequest(path);
        const response = httpServerMock.createResponseFactory();
        const context = createMockContext();

        await routeHandler(context, request, response);

        expect(response.forbidden).toHaveBeenCalledWith({
          body: expect.stringContaining(
            `Error connecting to '${path}':\n\nUnable to send requests to that path.`
          ),
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
    });
  });
});
