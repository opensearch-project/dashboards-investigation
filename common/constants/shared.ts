/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Client route
export const PPL_BASE = '/api/investigation/ppl';
export const PPL_SEARCH = '/search';
export const OBSERVABILITY_BASE = '/api/observability';
export const EVENT_ANALYTICS = '/event_analytics';
export const SAVED_OBJECTS = '/saved_objects';
export const SAVED_QUERY = '/query';
export const SAVED_VISUALIZATION = '/vis';
export const SECURITY_PLUGIN_ACCOUNT_API = '/api/v1/configuration/account';

// Server route
export const PPL_ENDPOINT = '/_plugins/_ppl';
export const SQL_ENDPOINT = '/_plugins/_sql';

export const investigationNotebookID = 'investigation-notebooks';
export const investigationNotebookTitle = 'Notebooks';
export const investigationNotebookPluginOrder = 5094;

// Shared Constants
export const SQL_DOCUMENTATION_URL = 'https://opensearch.org/docs/latest/search-plugins/sql/index/';
export const PPL_DOCUMENTATION_URL =
  'https://opensearch.org/docs/latest/search-plugins/sql/ppl/index';
export const UI_DATE_FORMAT = 'MM/DD/YYYY hh:mm A';

const BASE_DATACONNECTIONS_URI = '/_plugins/_query/_datasources';
export const OPENSEARCH_DATACONNECTIONS_API = {
  DATACONNECTION: `${BASE_DATACONNECTIONS_URI}`,
};

// Saved Objects
export const SAVED_OBJECT = '/object';

export const observabilityLogsID = 'observability-logs';

export const ENABLE_AI_FEATURES = 'enableAIFeatures';
