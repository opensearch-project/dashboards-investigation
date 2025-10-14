/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../../public/plugin_helpers/plugin_proxy_call';

export const addHeadFilter = (query: string) => {
  return `${query} | sort - _id | head 100`;
};

export const executePPLQueryWithHeadFilter = async ({
  http,
  dataSourceId,
  query,
}: {
  http: HttpSetup;
  dataSourceId: string | undefined;
  query: string;
}) => {
  return callOpenSearchCluster({
    http,
    dataSourceId,
    request: {
      path: `/_plugins/_ppl`,
      method: 'POST',
      body: JSON.stringify({
        query: addHeadFilter(query),
      }),
    },
  });
};
