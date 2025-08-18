/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IOpenSearchDashboardsResponse, IRouter } from '../../../../../src/core/server';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { getOpenSearchClientTransport } from '../utils';

export function registerLogPatternRoute(router: IRouter) {
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/logpattern/analyze`,
      validate: {
        body: schema.object({
          baselineStartTime: schema.maybe(schema.string()),
          baselineEndTime: schema.maybe(schema.string()),
          selectionStartTime: schema.string(),
          selectionEndTime: schema.string(),
          timeField: schema.string(),
          traceIdField: schema.maybe(schema.string()),
          logMessageField: schema.string(),
          indexName: schema.string(),
          dataSourceMDSId: schema.maybe(schema.string({ defaultValue: '' })),
        }),
      },
    },
    async (context, request, response): Promise<IOpenSearchDashboardsResponse> => {
      try {
        const transport = await getOpenSearchClientTransport({
          context,
          dataSourceId: request.body.dataSourceMDSId,
        });

        const { body } = await transport.request(
          {
            method: 'POST',
            path: `/_plugins/_ml/tools/_execute/LogPatternAnalysisTool`,
            body: {
              parameters: {
                baseTimeRangeStart: request.body.baselineStartTime,
                baseTimeRangeEnd: request.body.baselineEndTime,
                selectionTimeRangeStart: request.body.selectionStartTime,
                selectionTimeRangeEnd: request.body.selectionEndTime,
                traceFieldName: request.body.traceIdField,
                timeField: request.body.timeField,
                logFieldName: request.body.logMessageField,
                index: request.body.indexName,
              },
            },
          },
          {
            requestTimeout: 300000, // Set a timeout for the request
            maxRetries: 0, // Disable retries to avoid delays
          }
        );

        return response.ok({
          body: body.inference_results[0].output[0].result,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.body.error || 'Error analyzing log patterns',
        });
      }
    }
  );
}
