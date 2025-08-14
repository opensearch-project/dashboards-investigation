/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import now from 'performance-now';

import type {
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
  paragraph: ParagraphBackendType<unknown>;
  transport: OpenSearchClient['transport'];
}) => {
  let output: { agent_id: string } = { agent_id: '' };
  try {
    output =
      typeof paragraph.output?.[0].result === 'string'
        ? JSON.parse(paragraph.output?.[0].result)
        : paragraph.output?.[0].result;
  } catch (e) {
    // do nothing
  }

  if (!output.agent_id) {
    try {
      output.agent_id = (
        await getMLService().getMLConfig({
          transport,
          configName: 'os_deep_research',
        })
      ).configuration.agent_id;
    } catch (error) {
      // Add error catch here..
    }
  }
  return output.agent_id;
};

export const executePERAgentInParagraph = async ({
  transport,
  paragraph,
  context,
  baseMemoryId,
}: {
  transport: OpenSearchClient['transport'];
  paragraph: ParagraphBackendType<
    unknown,
    { prompts?: { systemPrompt?: string; executorSystemPrompt?: string } }
  >;
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
      
      ## RESPONSE FORMAT
      \${parameters.plan_execute_reflect_response_format}`,
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
      
      ## RESPONSE FORMAT
      \${parameters.plan_execute_reflect_response_format}`,

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
      
      ## RESPONSE FORMAT
      \${parameters.plan_execute_reflect_response_format}`,
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
        agent_id: agentId,
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
  return [getNotebookTopLevelContextPrompt(notebookInfo), ...allContext]
    .filter((item) => item)
    .map((item) => item)
    .join('\n');
};
