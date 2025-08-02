/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import 'core-js/stable';
import _ from 'lodash';
import 'regenerator-runtime/runtime';
import { Logger, OpenSearchClient } from '../../../../src/core/server';

export class QueryService {
  constructor(private readonly logger: Logger) {}

  private describeQueryInternal = async (
    transport: OpenSearchClient['transport'],
    query: string,
    path: string,
    responseFormat: string
  ) => {
    try {
      const queryRequest = {
        query,
      };

      const queryResponse = await transport.request({
        path,
        method: 'POST',
        body: JSON.stringify(queryRequest),
      });

      return {
        data: {
          ok: true,
          resp: _.isEqual(responseFormat, 'json')
            ? JSON.stringify(queryResponse.body)
            : queryResponse.body,
        },
      };
    } catch (err) {
      this.logger.info('error describeQueryInternal');
      this.logger.info(err);

      return {
        data: {
          ok: false,
          resp: err.response,
          body: err.body,
        },
      };
    }
  };

  describeSQLQuery = async (transport: OpenSearchClient['transport'], query: string) => {
    return this.describeQueryInternal(transport, query, 'investigationNotebook.sqlQuery', 'json');
  };

  describePPLQuery = async (transport: OpenSearchClient['transport'], query: string) => {
    return this.describeQueryInternal(transport, query, '/_plugins/_ppl', 'json');
  };
}
