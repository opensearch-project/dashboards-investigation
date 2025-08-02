/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const NOTEBOOKS_API_PREFIX = '/api/investigation';
export const NOTEBOOKS_FETCH_SIZE = 1000;
export const CREATE_NOTE_MESSAGE = 'Enter a name to describe the purpose of this notebook.';
export const NOTEBOOKS_DOCUMENTATION_URL =
  'https://opensearch.org/docs/latest/observability-plugin/notebooks/';

export const zeppelinURL = 'http://localhost:8080';

export const wreckOptions = {
  baseUrl: zeppelinURL,
  headers: { 'Content-Type': 'application/json' },
};

const BASE_NOTEBOOKS_URI = '/_plugins/_notebooks';
export const OPENSEARCH_NOTEBOOKS_API = {
  GET_NOTEBOOKS: `${BASE_NOTEBOOKS_URI}/notebooks`,
  NOTEBOOK: `${BASE_NOTEBOOKS_URI}/notebook`,
};

// Paragraph types
export const LOG_PATTERN_PARAGRAPH_TYPE = 'LOG_PATTERN';
export const ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE = 'ANOMALY_VISUALIZATION_ANALYSIS';
export const PPL_PARAGRAPH_TYPE = 'ppl';
