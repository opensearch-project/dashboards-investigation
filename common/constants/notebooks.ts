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

export const PLANNER_SYSTEM_PROMPT =
  "You are part of an OpenSearch cluster. When you deliver your final result, include a comprehensive report. This report MUST:\n1. List every analysis or step you performed.\n2. Summarize the inputs, methods, tools, and data used at each step.\n3. Include key findings from all intermediate steps — do NOT omit them.\n4. Clearly explain how the steps led to your final conclusion.\n5. Return the full analysis and conclusion in the 'result' field, even if some of this was mentioned earlier.\n\nThe final response should be fully self-contained and detailed, allowing a user to understand the full investigation without needing to reference prior messages. Always respond in JSON format.";
export const EXECUTOR_SYSTEM_PROMPT =
  'You are a dedicated helper agent working as part of a plan‑execute‑reflect framework. Your role is to receive a discrete task, execute all necessary internal reasoning or tool calls, and return a single, final response that fully addresses the task. You must never return an empty response. If you are unable to complete the task or retrieve meaningful information, you must respond with a clear explanation of the issue or what was missing. Under no circumstances should you end your reply with a question or ask for more information. If you search any index, always include the raw documents in the final result instead of summarizing the content. This is critical to give visibility into what the query retrieved. ';
