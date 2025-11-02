/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IOpenSearchDashboardsResponse, IRouter } from '../../../../../src/core/server';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { getOpenSearchClientTransport } from '../utils';
import { getMLService } from '../../services/get_set';
import { LogPattern, LogSequenceEntry } from '../../../common/types/log_pattern';

interface LogPatternAnalysisRes {
  logInsights: LogPattern[];
  patternMapDifference?: LogPattern[];
  EXCEPTIONAL?: Record<string, string>;
  BASE?: Record<string, string>;
}

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
          request,
        });

        const body = await getMLService().analyzeLogPattern({
          transport,
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
        });

        const convertMapToSequenceArray = (
          map: { [key: string]: string } | undefined
        ): LogSequenceEntry[] => {
          if (!map) return [];
          return Object.entries(map).map(([traceId, sequence]) => ({
            traceId,
            sequence,
          }));
        };

        const result = JSON.parse(
          body.inference_results[0].output[0].result
        ) as LogPatternAnalysisRes;

        return response.ok({
          body: {
            ...result,
            EXCEPTIONAL: convertMapToSequenceArray(result.EXCEPTIONAL),
            BASE: convertMapToSequenceArray(result.BASE),
          },
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
