/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const NOTEBOOKS_API_PREFIX = '/api/investigation';
export const NOTEBOOKS_FETCH_SIZE = 1000;
export const CREATE_NOTE_MESSAGE = 'Enter a name to describe the purpose of this notebook.';
export const NOTEBOOKS_DOCUMENTATION_URL =
  'https://opensearch.org/docs/latest/observability-plugin/notebooks/';

const BASE_NOTEBOOKS_URI = '/_plugins/_notebooks';
export const OPENSEARCH_NOTEBOOKS_API = {
  GET_NOTEBOOKS: `${BASE_NOTEBOOKS_URI}/notebooks`,
  NOTEBOOK: `${BASE_NOTEBOOKS_URI}/notebook`,
};

// Paragraph types
export const LOG_PATTERN_PARAGRAPH_TYPE = 'LOG_PATTERN';
export const DATA_DISTRIBUTION_PARAGRAPH_TYPE = 'ANOMALY_ANALYSIS';
export const PPL_PARAGRAPH_TYPE = 'ppl';
export const OTHER_PARAGRAPH_TYPE = 'OTHER';

// common log errors
export const errorKeywords = /\b(error|exception|failed|failure|panic|crash|fatal|abort|timeout|unavailable|denied|rejected|invalid|corrupt|broken|dead|kill)\b/gi;
export const dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';

export const NOTEBOOK_APP_NAME = 'investigate-notebook';

export const OBSERVABILITY_VISUALIZATION_TYPE = 'observability-visualization';

export const DASHBOARDS_VISUALIZATION_TYPE = 'visualization';
