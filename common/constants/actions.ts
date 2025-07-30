/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActionInputMetadata {
  [key: string]: {
    type: string;
    description: string;
    required?: boolean;
  };
}

export interface ActionMetadata {
  id: string;
  title: string;
  description: string;
  input_metadata?: ActionInputMetadata;
}

export const actionsMetadata: ActionMetadata[] = [
  {
    id: 'PPL',
    title: 'PPL',
    description: `display PPL block: Piped Processing Language (PPL) is a query language that focuses on processing data in a step-by-step manner.
      If input is natural language descriping what data it want to query, set the input as natural language, which will be transformed using Text to PPL agent(NOT YOUR JOB).
      If input is ppl query, this block can directly execute it.`,
    input_metadata: {
      userInput: {
        type: 'string',
        description: 'ppl query or natural language, set it the same as user input',
        required: false,
      },
    },
  },
  {
    id: 'DEEP_RESEARCH_AGENT',
    title: 'PlanAndExecuteAgent',
    description:
      'display PlanAndExecuteAgent block: PlanAndExecuteAgent is capable of breaking down complex tasks into simple steps and re-evaluating the steps based on intermediate results.',
    input_metadata: {
      question: {
        type: 'string',
        description: 'user question',
        required: true,
      },
    },
  },
  {
    id: 'VISUALIZATION',
    title: 'Visualization',
    description:
      'display visualization block: user can select existing visualization and display it in the block.',
    input_metadata: {
      search_word: {
        type: 'string',
        description: 'search_word is used to search existing visualization',
        required: true,
      },
    },
  },
  {
    id: 'MARKDOWN',
    title: 'Markdown',
    description:
      'display markdown block: If the input follows markdown syntax, use the markdown editor to create formatted text.',
    input_metadata: {
      markdown_text: {
        type: 'string',
        description: 'markdown text',
        required: true,
      },
    },
  },
];
