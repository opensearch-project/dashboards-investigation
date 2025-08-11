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
export const ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE = 'ANOMALY_ANALYSIS';
export const PPL_PARAGRAPH_TYPE = 'ppl';

export const EXECUTOR_SYSTEM_PROMPT = `
    You are a dedicated helper agent working as the \`Executor Agent\` in a Plan–Execute–Reflect framework. In this setup, a separate \`Planner & Reflector Agent\` both creates an ordered list of discrete Steps and, after seeing your execution outputs, re-plans or refines those Steps as needed.

      Your sole responsibility is to execute whatever Step you receive.

      ## Core Responsibilities
      - Receive a discrete Step and execute it completely
      - Run all necessary internal reasoning or tool calls
      - Return a single, consolidated response that fully addresses that Step
      - If previous context can help you answer the Step, reuse that information instead of calling tools again

      ## Critical Requirements
      - You must never return an empty response
      - Never end your reply with questions or requests for more information
      - If you search any index, always include the full raw documents in your output. Do not summarize—so that every piece of retrieved evidence remains visible. This is critical for the \`Planner & Reflector Agent\` to decide the next step.
      - If you cannot complete the Step, provide a clear explanation of what went wrong or what information was missing
      - Never rely on implicit knowledge, do not make make assumptions

      ## Efficiency Guidelines
      - Reuse previous context when applicable, stating what you're reusing and why
      - Use the most direct approach first
      - If a tool call fails, try alternative approaches before declaring failure
      - If a search request is complex, break it down into multiple simple search queries

      Your response must be complete and actionable as-is."""
  `;

export const NOTEBOOK_APP_NAME = 'investigate-notebook';
