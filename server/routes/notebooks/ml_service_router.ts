/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IOpenSearchDashboardsResponse, IRouter } from '../../../../../src/core/server';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { getOpenSearchClientTransport } from '../utils';

export function registerMLServiceRoute(router: IRouter) {
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/{agentId}/execute/stream`,
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
        body: schema.object({
          threadId: schema.string(),
          runId: schema.string(),
          messages: schema.arrayOf(
            schema.object({
              id: schema.string(),
              role: schema.string(),
              content: schema.string(),
            })
          ),
          tools: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                description: schema.string(),
                parameters: schema.object({
                  type: schema.string(),
                  properties: schema.recordOf(
                    schema.string(),
                    schema.object({
                      type: schema.string(),
                      description: schema.string(),
                    })
                  ),
                  required: schema.arrayOf(schema.string()),
                }),
              })
            )
          ),
          context: schema.maybe(
            schema.arrayOf(
              schema.object({
                description: schema.string(),
                value: schema.string(),
              })
            )
          ),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response): Promise<IOpenSearchDashboardsResponse> => {
      try {
        const transport = await getOpenSearchClientTransport({
          context,
          dataSourceId: request.query.dataSourceId,
        });

        const result = await transport.request(
          {
            path: `/_plugins/_ml/agents/${encodeURIComponent(
              request.params.agentId
            )}/_execute/stream`,
            method: 'POST',
            body: request.body,
          },
          {
            requestTimeout: 1000 * 60 * 10,
            maxRetries: 0,
            asStream: true,
          }
        );

        return response.ok({
          headers: {
            // Browsers often need to buffer the entire response before decompressing, which defeats the purpose of streaming.
            // need to set 'Content-Encoding' as 'identity' here to prevent browser buffering the response.
            'Content-Encoding': 'identity',
            Connection: 'keep-alive',
            'Content-Type': 'text/event-stream',
          },
          body: result.body,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.body.error || 'Error when calling agent streaming API',
        });
      }
    }
  );
}
