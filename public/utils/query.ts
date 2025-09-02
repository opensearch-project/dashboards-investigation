/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../../public/plugin_helpers/plugin_proxy_call';

export const addHeadFilter = (query: string) => {
  return `${query} | eval random_score = rand() | sort random_score | head 100`;
};

export const removeRandomScoreFromResponse = (response: any) => {
  let randomScoreIndex = -1;
  if (response?.schema) {
    randomScoreIndex = response.schema.findIndex((field: any) => field.name === 'random_score');
    if (randomScoreIndex !== -1) {
      response.schema = response.schema.filter((field: any) => field.name !== 'random_score');
    }
  }
  if (response?.datarows && randomScoreIndex !== -1) {
    response.datarows = response.datarows.map((row: any[]) =>
      row.filter((_, index) => index !== randomScoreIndex)
    );
  }
  return response;
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
  }).then((res) => {
    return removeRandomScoreFromResponse(res);
  });
};
