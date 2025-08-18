/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../../../../src/core/public';

export const searchQuery = async (
  httpClient: HttpSetup,
  path: string,
  method: string,
  dataSourceId: string,
  query: string
) => {
  return await httpClient.post(`/api/console/proxy`, {
    query: {
      path,
      method,
      dataSourceId,
    },
    body: query,
    prependBasePath: true,
    asResponse: true,
    withLongNumeralsSupport: true,
  });
};
