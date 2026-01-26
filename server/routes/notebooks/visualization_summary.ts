/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { schema } from '@osd/config-schema';
import { IRouter, IOpenSearchDashboardsResponse } from '../../../../../src/core/server';
import { getOpenSearchClientTransport } from '../utils';
import { OPENSEARCH_ML_COMMONS_API_PREFIX } from '../../../common/constants/ml_commons';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';

const ML_CONFIG_NAME = 'os_visualization_summary';

/**
 * Route handler for generating visualization summaries using ML models
 *
 * This endpoint:
 * 1. Receives a base64-encoded visualization image
 * 2. Retrieves the ML model ID from the ML config API
 * 3. Calls the ML model predict API to generate a summary
 *
 * @param router - OpenSearch Dashboards router instance
 */
export function registerVisualizationSummaryRoute(router: IRouter) {
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/visualization/summary`,
      validate: {
        body: schema.object({
          visualization: schema.string({
            minLength: 1,
          }),
          localTimeZoneOffset: schema.number(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response): Promise<IOpenSearchDashboardsResponse> => {
      try {
        const { visualization, localTimeZoneOffset } = request.body;
        const { dataSourceId } = request.query;

        // Get transport client with data source support
        const transport = await getOpenSearchClientTransport({
          context,
          dataSourceId,
          request,
        });

        // Step 1: Get model ID from ML config API
        let agentId: string;
        try {
          const configResponse = await transport.request({
            method: 'GET',
            path: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/config/${ML_CONFIG_NAME}`,
          });

          // Extract agent ID from config response
          const configBody = configResponse.body as any;
          agentId = configBody?.configuration?.agent_id;

          if (!agentId) {
            return response.notFound({
              body: {
                message: `Agent not found.`,
              },
            });
          }
        } catch (configError: any) {
          return response.customError({
            statusCode: configError.statusCode || 500,
            body: {
              message: `Failed to retrieve ML config '${ML_CONFIG_NAME}': ${configError.message}`,
            },
          });
        }

        // Step 2: Call ML model predict API with the visualization
        try {
          const predictResponse = await transport.request({
            method: 'POST',
            path: `${OPENSEARCH_ML_COMMONS_API_PREFIX}/agents/${agentId}/_execute`,
            body: {
              parameters: {
                image_base64: visualization,
                local_time_offset: localTimeZoneOffset,
              },
            },
          });

          const predictBody = predictResponse.body as any;

          // Extract summary from prediction response
          // The response structure may vary depending on the model
          const resultString = predictBody?.inference_results?.[0]?.output?.[0]?.result;
          if (!resultString) {
            return response.customError({
              statusCode: 500,
              body: {
                message: `Invalid ML response structure: missing result field`,
              },
            });
          }

          let resultJson;
          try {
            resultJson = JSON.parse(resultString);
          } catch (parseError) {
            return response.customError({
              statusCode: 500,
              body: {
                message: `Failed to parse ML response: invalid JSON`,
              },
            });
          }

          const summaryText = resultJson?.output?.message?.content?.[0]?.text;
          if (!summaryText) {
            return response.customError({
              statusCode: 500,
              body: {
                message: `Invalid ML response structure: missing summary text`,
              },
            });
          }

          return response.ok({
            body: {
              summary: summaryText,
            },
          });
        } catch (predictError: any) {
          return response.customError({
            statusCode: predictError.statusCode || 500,
            body: {
              message: `Failed to generate visualization summary using agent '${agentId}': ${predictError.message}`,
            },
          });
        }
      } catch (error: any) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: `Unexpected error generating visualization summary: ${error.message}`,
          },
        });
      }
    }
  );
}
