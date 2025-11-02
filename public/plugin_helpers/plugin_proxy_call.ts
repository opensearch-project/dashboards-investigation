/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { HttpFetchOptionsWithPath, HttpStart } from '../../../../src/core/public';

export const callOpenSearchCluster = (props: {
  http: HttpStart;
  dataSourceId?: string;
  request: Pick<HttpFetchOptionsWithPath, 'path' | 'method' | 'body'>;
}) => {
  const path = props.request.path;
  const query: HttpFetchOptionsWithPath['query'] = {
    path,
    method: props.request.method || 'GET',
  };
  if (props.dataSourceId) {
    query.dataSourceId = props.dataSourceId;
  }

  if (props.request.path.startsWith('/_plugins/_ml')) {
    return props.http.post({
      path: `${NOTEBOOKS_API_PREFIX}/ml/proxy`,
      query,
      body: props.request.body,
    });
  }

  return props.http.post({
    path: '/api/console/proxy',
    query,
    body: props.request.body,
  });
};
