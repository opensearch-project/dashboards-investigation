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
    description:
      'display PPL block: Piped Processing Language (PPL) is a query language that focuses on processing data in a sequential, step-by-step manner.',
    input_metadata: {
      ppl: {
        type: 'string',
        description: 'ppl query',
        required: true,
      },
    },
  },
  {
    id: 'T2PPL',
    title: 'Text to PPL',
    description:
      'display T2PPL block: User input what data they want to query, which will be tranformed into PPL query in this block',
    input_metadata: {
      input: {
        type: 'string',
        description: 'natural language input',
        required: true,
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
