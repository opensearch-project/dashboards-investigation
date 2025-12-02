/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { errors } from '@opensearch-project/opensearch';
import {
  Logger,
  OpenSearchClient,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  RequestHandlerContext,
} from '../../../../src/core/server';
import { getLogger } from '../services/get_set';

export const getOpenSearchClientTransport = async ({
  context,
  dataSourceId,
  request, // eslint-disable-line
}: {
  context: RequestHandlerContext & {
    dataSource?: {
      opensearch: {
        getClient: (dataSourceId: string) => Promise<OpenSearchClient>;
      };
    };
  };
  dataSourceId?: string;
  request: OpenSearchDashboardsRequest; // the request is required in case we need to get auth info.
}): Promise<OpenSearchClient['transport']> => {
  if (dataSourceId && context.dataSource) {
    return (await context.dataSource.opensearch.getClient(dataSourceId)).transport;
  }
  return context.core.opensearch.client.asCurrentUser.transport;
};

export const handleError = (
  e: any,
  res: OpenSearchDashboardsResponseFactory,
  logger: Logger = getLogger()
) => {
  logger.error(`Investigation error happens: ${e.body || e.message}`);
  // handle OpenSearch client connection errors
  if (e instanceof errors.NoLivingConnectionsError || e instanceof errors.ConnectionError) {
    return res.customError({
      body: e.message,
      statusCode: 400,
    });
  }

  // handle http response error of calling backend API
  if (e.statusCode >= 400) {
    return res.customError({
      body: {
        message: 'Unable to process the request, please try again later.',
      },
      statusCode: e.statusCode,
    });
  }

  // Return an general internalError for unhandled server-side issues
  return res.internalError();
};
