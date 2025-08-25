/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import now from 'performance-now';

import type {
  DeepResearchInputParameters,
  DeepResearchOutputResult,
  NotebookContext,
  ParagraphBackendType,
} from 'common/types/notebooks';
import {
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  EXECUTOR_SYSTEM_PROMPT,
} from '../../../../common/constants/notebooks';
import { getInputType } from '../../../../common/utils/paragraph';
import {
  getNotebookTopLevelContextPrompt,
  getOpenSearchClientTransport,
} from '../../../routes/utils';
import { getMLService, getParagraphServiceSetup } from '../../../services/get_set';
import {
  OpenSearchClient,
  RequestHandlerContext,
  SavedObject,
} from '../../../../../../src/core/server';

const getAgentIdFromParagraph = async ({
  transport,
  paragraph,
}: {
  paragraph: ParagraphBackendType<unknown, DeepResearchInputParameters>;
  transport: OpenSearchClient['transport'];
}) => {
  // FIXME: remove this when production release
  let agentId = paragraph.input.parameters?.agentId;
  if (!agentId) {
    try {
      const output =
        typeof paragraph.output?.[0].result === 'string'
          ? JSON.parse(paragraph.output?.[0].result)
          : paragraph.output?.[0].result;
      agentId = output.agent_id;
    } catch (e) {
      // do nothing
    }
  }

  if (!agentId) {
    try {
      agentId = (
        await getMLService().getMLConfig({
          transport,
          configName: 'os_deep_research',
        })
      ).configuration.agent_id;
    } catch (error) {
      // Add error catch here..
    }
  }
  return agentId;
};

export const executePERAgentInParagraph = async ({
  transport,
  paragraph,
  context,
  baseMemoryId,
}: {
  transport: OpenSearchClient['transport'];
  paragraph: ParagraphBackendType<unknown, DeepResearchInputParameters>;
  baseMemoryId?: string;
  context?: string;
}) => {
  const agentId = await getAgentIdFromParagraph({
    transport,
    paragraph,
  });

  if (!agentId) {
    throw new Error('No PER agent id configured.');
  }
  const customizedPrompts = paragraph.input.parameters?.prompts;
  const startTime = now();
  const parameters = {
    question: paragraph.input.inputText,
    planner_prompt_template: `
      ## AVAILABLE TOOLS
      \${parameters.tools_prompt}

      ## PLANNING GUIDANCE
      \${parameters.planner_prompt}

      ## OBJECTIVE
      Your job is to fulfill user's requirements and answer their questions effectively. User Input:
      \`\`\`\${parameters.user_prompt}\`\`\`

      ## PREVIOUS CONTEXT
      The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
      [\${parameters.context}]

      Remember: Respond only in JSON format following the required schema.`,
    planner_with_history_template: `
      ## AVAILABLE TOOLS
      \${parameters.tools_prompt}

      ## PLANNING GUIDANCE
      \${parameters.planner_prompt}

      ## OBJECTIVE
      The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
      \`\`\`\${parameters.user_prompt}\`\`\`

      ## PREVIOUS CONTEXT
      The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
      [\${parameters.context}]

      ## CURRENT PROGRESS
      You have already completed the following steps in the current plan. Consider these when determining next actions:
      [\${parameters.completed_steps}]

      Remember: Respond only in JSON format following the required schema.`,

    reflect_prompt_template: `
      ## AVAILABLE TOOLS
      \${parameters.tools_prompt}

      ## PLANNING GUIDANCE
      \`\`\`\${parameters.planner_prompt}\`\`\`

      ## OBJECTIVE
      The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
      \${parameters.user_prompt}

      ## ORIGINAL PLAN
      This was the initially created plan to address the objective:
      [\${parameters.steps}]

      ## PREVIOUS CONTEXT
      The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research without doing the same thing again:
      [\${parameters.context}]

      ## CURRENT PROGRESS
      You have already completed the following steps from the original plan. Consider these when determining next actions:
      [\${parameters.completed_steps}]

      ## REFLECTION GUIDELINE
      \${parameters.reflect_prompt}

      Remember: Respond only in JSON format following the required schema.`,
    context,
    system_prompt: customizedPrompts?.systemPrompt ?? undefined,
    executor_system_prompt: `${
      customizedPrompts?.executorSystemPrompt ?? EXECUTOR_SYSTEM_PROMPT
    } \n You have currently executed the following steps: \n ${context}`,
    memory_id: baseMemoryId,
  };
  const { body } = await getMLService().executeAgent({
    transport,
    agentId,
    async: true,
    parameters,
  });
  const dateModified = new Date().toISOString();
  const output: ParagraphBackendType<DeepResearchOutputResult>['output'] = [
    {
      outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
      result: {
        taskId: body.task_id,
        memoryId: body.response?.memory_id,
      },
      execution_time: `${(now() - startTime).toFixed(3)} ms`,
    },
  ];

  return {
    ...paragraph,
    dateModified,
    input: {
      ...paragraph.input,
      // FIXME: this is used for debug
      parameters: {
        ...(paragraph.input.parameters ?? {}),
        agentId,
        PERAgentInput: {
          body: JSON.stringify({
            agentId,
            parameters,
          }),
        },
        PERAgentContext: context,
      },
    },
    output,
  };
};

export const generateContextPromptFromParagraphs = async ({
  paragraphs,
  routeContext,
  notebookInfo,
  ignoreInputTypes = [],
}: {
  paragraphs: Array<ParagraphBackendType<unknown>>;
  routeContext: RequestHandlerContext;
  notebookInfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>;
  ignoreInputTypes?: string[];
}) => {
  const allContext = await Promise.all(
    paragraphs
      .filter((paragraph) => !ignoreInputTypes.includes(getInputType(paragraph)))
      .map(async (paragraph) => {
        const transport = await getOpenSearchClientTransport({
          context: routeContext,
          dataSourceId: paragraph.dataSourceMDSId,
        });
        const paragraphRegistry = getParagraphServiceSetup().getParagraphRegistry(
          getInputType(paragraph)
        );
        if (!paragraphRegistry) {
          return '';
        }

        return await paragraphRegistry.getContext({
          transport,
          paragraph,
        });
      })
  );

  const objective = `
    ## Request
    Based on the information above, please help me analyze the following:
    1. What potential root causes could explain the observed behavior?
    2. What patterns or anomalies should I look for in the data?
    3. What additional data or metrics might be useful to collect?
    4. What are the next steps you recommend for this investigation?

    Please provide your analysis, focusing on technical insights that could help resolve this issue.`;

  return [getNotebookTopLevelContextPrompt(notebookInfo), ...allContext, objective]
    .filter((item) => item)
    .map((item) => item)
    .join('\n');
};
