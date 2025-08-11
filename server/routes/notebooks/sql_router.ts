/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import {
  IOpenSearchDashboardsResponse,
  IRouter,
  ResponseError,
} from '../../../../../src/core/server';
import { QueryService } from '../../services/query_service';
import { getOpenSearchClientTransport } from '../utils';

export function registerSqlRoute(
  server: IRouter,
  service: QueryService,
  _dataSourceEnabled: boolean
) {
  server.post(
    {
      path: '/api/investigation/sql/sqlquery',
      validate: {
        body: schema.any(),
        query: schema.object({
          dataSourceMDSId: schema.maybe(schema.string({ defaultValue: '' })),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const retVal = await service.describeSQLQuery(
        await getOpenSearchClientTransport({
          context,
          dataSourceId: request.query.dataSourceMDSId,
        }),
        request.body
      );
      return response.ok({
        body: retVal,
      });
    }
  );

  server.post(
    {
      path: '/api/investigation/sql/pplquery',
      validate: {
        body: schema.any(),
        query: schema.object({
          dataSourceMDSId: schema.maybe(schema.string({ defaultValue: '' })),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const retVal = await service.describePPLQuery(
        await getOpenSearchClientTransport({
          context,
          dataSourceId: request.query.dataSourceMDSId,
        }),
        request.body
      );
      return response.ok({
        body: retVal,
      });
    }
  );
}
