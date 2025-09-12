/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PPL_ENDPOINT } from '../../common/constants/shared';
import { HttpSetup } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../../public/plugin_helpers/plugin_proxy_call';

/**
 * The size that query result should always be sampling to
 *
 * TODO: adjust this size if required
 */
const QUERY_RESULT_SAMPLE_SIZE = 100;

const SAMPLING_THRESHOLD = 0.01;

/**
 * Random sampling mechanism that generates a threshold score to filter query results:
 *
 * Formula: score = 1 - (target_size / total_count) - buffer
 *
 * Examples:
 * - Count: 1000 → Score: 0.89 → Keeps ~11% of records → ~110 samples → head 100
 * - Count: 400 → Score: 0.74 → Keeps ~26% of records → ~104 samples → head 100
 *
 * The buffer (0.01) ensures we get slightly more than the target size to account for
 * randomness, then `head 100` guarantees exactly 100 results.
 */
export const addSamplingFilter = (query: string, count: number): string => {
  const score = Math.max(
    0,
    parseFloat((1 - QUERY_RESULT_SAMPLE_SIZE / count - SAMPLING_THRESHOLD).toFixed(2))
  );
  return `${query} | eval random_score=rand() | where random_score > ${score} | head ${QUERY_RESULT_SAMPLE_SIZE}`;
};

interface PPLQueryParams {
  http: HttpSetup;
  dataSourceId?: string;
  query: string;
}

const executePPLQuery = (params: PPLQueryParams, query: string) => {
  return callOpenSearchCluster({
    http: params.http,
    dataSourceId: params.dataSourceId,
    request: {
      path: PPL_ENDPOINT,
      method: 'POST',
      body: JSON.stringify({ query }),
    },
  });
};

export const executePPLQueryWithSampling = async (params: PPLQueryParams) => {
  const { query } = params;

  // Skip count check if query already has count aggregation to avoid conflicts
  if (query.toLowerCase().includes('stats count()')) {
    return executePPLQuery(params, `${query} | head ${QUERY_RESULT_SAMPLE_SIZE}`);
  }

  try {
    const countResponse = await executePPLQuery(params, `${query} | stats count()`);
    const count = countResponse?.datarows?.[0]?.[0];

    if (count === 0) {
      // No need to execute another PPL query as the result is empty anyway
      return {
        datarows: [],
      };
    }

    const finalQuery =
      count > QUERY_RESULT_SAMPLE_SIZE
        ? addSamplingFilter(query, count)
        : `${query} | head ${QUERY_RESULT_SAMPLE_SIZE}`;

    return executePPLQuery(params, finalQuery);
  } catch (error) {
    // Fallback to simple head limit if count query fails
    return executePPLQuery(params, `${query} | head ${QUERY_RESULT_SAMPLE_SIZE}`);
  }
};
