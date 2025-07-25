/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../../src/core/server';
import {
  INVESTIGATION_ML_COMMONS_API,
  OPENSEARCH_ML_COMMONS_API,
} from '../../../common/constants/ml_commons';
import { getOpenSearchClientTransport } from '../utils';

export function registerMLCommonsRoutes(router: IRouter) {
  /**
   * Returns single task detailed.
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.singleTask,
      validate: {
        params: schema.object({
          taskId: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      try {
        const { body } = await transport.request({
          method: 'GET',
          path: OPENSEARCH_ML_COMMONS_API.singleTask.replace('{taskId}', request.params.taskId),
        });
        return response.ok({ body });
      } catch (e) {
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns list of agents
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.agents,
      validate: {
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
            types: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      const types = Array.isArray(request.query?.types)
        ? request.query.types
        : request.query?.types
        ? [request.query.types]
        : [];
      try {
        const { body } = await transport.request({
          method: 'POST',
          path: OPENSEARCH_ML_COMMONS_API.agentsSearch,
          body: types
            ? {
                query: {
                  terms: {
                    type: types,
                  },
                },
                size: 10000,
              }
            : {},
        });
        return response.ok({ body });
      } catch (e) {
        if (e.meta.body.status === 404) {
          return response.ok({ body: { hits: { hits: [] } } });
        }
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns messages of memory
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.memoryMessages,
      validate: {
        params: schema.object({
          memoryId: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
            next_token: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      try {
        const { body } = await transport.request({
          method: 'GET',
          path: OPENSEARCH_ML_COMMONS_API.memoryMessages.replace(
            `{memoryId}`,
            request.params.memoryId
          ),
          querystring: request.query?.next_token
            ? {
                next_token: request.query.next_token,
              }
            : {},
        });
        return response.ok({ body });
      } catch (e) {
        if (e.meta.body.status === 404) {
          return response.ok({ body: { messages: [] } });
        }
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns traces of message
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.messageTraces,
      validate: {
        params: schema.object({
          messageId: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
            next_token: schema.maybe(schema.number()),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      try {
        const { body } = await transport.request({
          method: 'GET',
          path: OPENSEARCH_ML_COMMONS_API.messageTraces.replace(
            `{messageId}`,
            request.params.messageId
          ),
          querystring: {
            next_token: request.query?.next_token,
          },
        });
        return response.ok({ body });
      } catch (e) {
        if (e.meta.body.status === 404) {
          return response.ok({ body: [] });
        }
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns list of memories
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.memory,
      validate: {
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
            query: schema.maybe(
              schema.object(
                {},
                {
                  unknowns: 'allow',
                }
              )
            ),
            size: schema.maybe(schema.number()),
            sort: schema.maybe(schema.mapOf(schema.string(), schema.any())),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      try {
        const { body } = await transport.request({
          method: 'POST',
          path: OPENSEARCH_ML_COMMONS_API.memorySearch,
          body: {
            query: request.query?.query ? request.query.query : { match_all: {} },
            // query: { match_all: {} },
            ...(request.query?.size ? { size: request.query?.size } : {}),
            ...(request.query?.sort ? { sort: [request.query.sort] } : {}),
          },
        });
        return response.ok({ body });
      } catch (e) {
        if (e.meta.body.status === 404) {
          return response.ok({ body: { hits: { hits: [] } } });
        }
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns single task detailed.
   */
  router.get(
    {
      path: INVESTIGATION_ML_COMMONS_API.singleMemory,
      validate: {
        params: schema.object({
          memoryId: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            data_source_id: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
        dataSourceId: request.query?.data_source_id,
      });
      try {
        const { body } = await transport.request({
          method: 'GET',
          path: OPENSEARCH_ML_COMMONS_API.singleMemory.replace(
            '{memoryId}',
            request.params.memoryId
          ),
        });
        return response.ok({ body });
      } catch (e) {
        return response.badRequest({ body: e.message });
      }
    }
  );

  /**
   * Returns selected action.
   */
  router.post(
    {
      path: INVESTIGATION_ML_COMMONS_API.actionSelection,
      validate: {
        body: schema.object({
          // actions_metadata: schema.arrayOf(
          //   schema.object({
          //     id: schema.string(),
          //     title: schema.string(),
          //     description: schema.string(),
          //     input_metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          //   })
          // ),
          parameters: schema.object({
            actions_metadata: schema.string(),
            input_question: schema.string(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      const transport = await getOpenSearchClientTransport({
        context,
      });
      try {
        const { body: responseBody } = await transport.request({
          method: 'GET',
          path: '/_plugins/_ml/config/action-selection-agent',
        });
        const agentId = responseBody.configuration.agent_id;
        console.log(request.body);
        const { body } = await transport.request({
          method: 'POST',
          path: OPENSEARCH_ML_COMMONS_API.actionSelection.replace('{agentId}', agentId),
          body: request.body,
        });
        return response.ok({ body });
      } catch (e) {
        console.log(e.body.error);
        return response.badRequest({ body: e.message });
      }
    }
  );
}
