/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import now from 'performance-now';
import { v4 as uuid } from 'uuid';
import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  EXECUTOR_SYSTEM_PROMPT,
  LOG_PATTERN_PARAGRAPH_TYPE,
} from '../../../common/constants/notebooks';
import { SavedObjectsClientContract, SavedObject } from '../../../../../src/core/server/types';
import { NOTEBOOK_SAVED_OBJECT } from '../../../common/types/observability_saved_object_attributes';
import { formatNotRecognized, inputIsQuery } from '../../common/helpers/notebooks/query_helpers';
import { RequestHandlerContext } from '../../../../../src/core/server';
import { getInputType } from '../../../common/utils/paragraph';
import { updateParagraphText } from '../../common/helpers/notebooks/paragraph';
import {
  DeepResearchInputParameters,
  DeepResearchOutputResult,
  NotebookBackendType,
  NotebookContext,
  ParagraphBackendType,
} from '../../../common/types/notebooks';
import { getNotebookTopLevelContextPrompt, getOpenSearchClientTransport } from '../../routes/utils';
import { getParagraphServiceSetup } from '../../services/get_set';

export function createNotebook<T>(paragraphInput: string, inputType: string, parameters?: T) {
  try {
    let paragraphType = 'MARKDOWN';
    if (inputType === 'VISUALIZATION') {
      paragraphType = 'VISUALIZATION';
    }
    if (inputType === 'OBSERVABILITY_VISUALIZATION') {
      paragraphType = 'OBSERVABILITY_VISUALIZATION';
    }
    if (paragraphInput.substring(0, 3) === '%sql' || paragraphInput.substring(0, 3) === '%ppl') {
      paragraphType = 'QUERY';
    }
    if (inputType === 'DEEP_RESEARCH') {
      paragraphType = inputType;
    }
    if (inputType === ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE) {
      paragraphType = inputType;
    }
    if (inputType === LOG_PATTERN_PARAGRAPH_TYPE) {
      paragraphType = inputType;
    }
    const inputObject = {
      inputType: paragraphType,
      inputText: paragraphInput,
      parameters,
    };
    const outputObjects: ParagraphBackendType<string>['output'] = [
      {
        outputType: paragraphType,
        result: '',
        execution_time: '0s',
      },
    ];
    const newParagraph: ParagraphBackendType<string, T> = {
      id: 'paragraph_' + uuid(),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      input: inputObject,
      output: outputObjects,
    };

    return newParagraph;
  } catch (error) {
    throw new Error('Create Paragraph Error:' + error);
  }
}

export async function fetchNotebook(
  noteId: string,
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  try {
    const notebook = await opensearchNotebooksClient.get<{ savedNotebook: NotebookBackendType }>(
      NOTEBOOK_SAVED_OBJECT,
      noteId
    );
    return notebook;
  } catch (error) {
    throw new Error('update Paragraph Error:' + error);
  }
}

export async function createParagraphs<TOutput>(
  params: {
    noteId: string;
    input: ParagraphBackendType<TOutput>['input'];
    dataSourceMDSId?: string;
    paragraphIndex: number;
  },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookInfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const paragraphs = notebookInfo.attributes.savedNotebook.paragraphs;
  const newParagraph = createNotebook(
    params.input.inputText,
    params.input.inputType,
    params.input.parameters
  );
  paragraphs.splice(params.paragraphIndex, 0, newParagraph);
  const updateNotebook = {
    paragraphs,
    dateModified: new Date().toISOString(),
  };
  await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, params.noteId, {
    savedNotebook: updateNotebook,
  });
  await fetchNotebook(params.noteId, opensearchNotebooksClient);
  return newParagraph;
}

export async function deleteParagraphs(
  params: { noteId: string; paragraphId: string | undefined },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const updatedparagraphs: Array<ParagraphBackendType<unknown>> = [];
  if (params.paragraphId !== undefined) {
    notebookinfo.attributes.savedNotebook.paragraphs.map((paragraph) => {
      if (paragraph.id !== params.paragraphId) {
        updatedparagraphs.push(paragraph);
      }
    });
  }

  const updateNotebook = {
    paragraphs: updatedparagraphs,
    dateModified: new Date().toISOString(),
  };
  try {
    await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, params.noteId, {
      savedNotebook: updateNotebook,
    });
    return { paragraphs: updatedparagraphs };
  } catch (error) {
    throw new Error('update Paragraph Error:' + error);
  }
}

export async function updateRunFetchParagraph<TOutput>(
  params: {
    noteId: string;
    paragraphId: string;
    input: ParagraphBackendType<TOutput>['input'];
    dataSourceMDSId?: string;
  },
  opensearchNotebooksClient: SavedObjectsClientContract,
  context: RequestHandlerContext
) {
  try {
    const notebookInfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
    const updatedInputParagraphs = updateParagraphs(
      notebookInfo.attributes.savedNotebook.paragraphs,
      params.paragraphId,
      params.input,
      params.dataSourceMDSId
    );
    const updatedOutputParagraphs = await runParagraph<TOutput>(
      updatedInputParagraphs,
      params.paragraphId,
      context,
      notebookInfo
    );

    const updateNotebook: {
      paragraphs: Array<ParagraphBackendType<TOutput>>;
      dateModified: string;
      context?: NotebookContext;
    } = {
      paragraphs: updatedOutputParagraphs,
      dateModified: new Date().toISOString(),
    };
    const notebookContext = notebookInfo.attributes.savedNotebook?.context;
    if (notebookContext && !notebookContext.memoryId) {
      const targetParagraph:
        | ParagraphBackendType<DeepResearchOutputResult>
        | undefined = updatedOutputParagraphs.find(({ id }) => id === params.paragraphId) as
        | ParagraphBackendType<DeepResearchOutputResult>
        | undefined;
      if (targetParagraph?.output?.[0]?.outputType === 'DEEP_RESEARCH') {
        const { result } = targetParagraph.output[0];

        if (typeof result !== 'string' && 'memoryId' in result) {
          updateNotebook.context = {
            ...notebookContext,
            memoryId: result.memoryId,
          };
        }
      }
    }
    await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, params.noteId, {
      savedNotebook: updateNotebook,
    });
    let resultParagraph = {};
    let index = 0;

    for (index = 0; index < updatedOutputParagraphs.length; ++index) {
      if (params.paragraphId === updatedOutputParagraphs[index].id) {
        resultParagraph = updatedOutputParagraphs[index];
      }
    }
    return resultParagraph;
  } catch (error) {
    throw new Error('Update/Run Paragraph Error:' + error);
  }
}

export async function runParagraph<TOutput>(
  paragraphs: Array<ParagraphBackendType<unknown>>,
  paragraphId: string,
  context: RequestHandlerContext,
  notebookinfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>
): Promise<Array<ParagraphBackendType<TOutput>>> {
  try {
    const updatedParagraphs: Array<ParagraphBackendType<TOutput>> = [];
    let index = 0;
    for (index = 0; index < paragraphs.length; ++index) {
      const startTime = now();

      // use string as default
      const updatedParagraph: ParagraphBackendType<string | unknown> = {
        ...paragraphs[index],
      } as ParagraphBackendType<string | unknown>;
      if (paragraphs[index].id === paragraphId) {
        updatedParagraph.dateModified = new Date().toISOString();
        if (inputIsQuery(paragraphs[index].input.inputText)) {
          updatedParagraph.output = [
            {
              outputType: 'QUERY',
              result: updateParagraphText(paragraphs[index].input.inputText, notebookinfo),
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (paragraphs[index].input.inputText.substring(0, 3) === '%md') {
          updatedParagraph.output = [
            {
              outputType: 'MARKDOWN',
              result: updateParagraphText(paragraphs[index].input.inputText, notebookinfo),
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (paragraphs[index].input.inputType === 'VISUALIZATION') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'VISUALIZATION',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (paragraphs[index].input.inputType === 'OBSERVABILITY_VISUALIZATION') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'OBSERVABILITY_VISUALIZATION',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (paragraphs[index].input.inputType === 'LOG_PATTERN') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'LOG_PATTERN',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (paragraphs[index].input.inputType === 'DEEP_RESEARCH') {
          const deepResearchAgentUpdateParagraph: ParagraphBackendType<
            DeepResearchOutputResult,
            DeepResearchInputParameters
          > = paragraphs[index] as ParagraphBackendType<
            DeepResearchOutputResult,
            DeepResearchInputParameters
          >;
          let output: { agent_id: string } = { agent_id: '' };
          try {
            output =
              typeof updatedParagraph.output?.[0].result === 'string'
                ? JSON.parse(updatedParagraph.output?.[0].result)
                : updatedParagraph.output?.[0].result;
          } catch (e) {
            // do nothing
          }

          if (!output.agent_id) {
            try {
              const osDeepResearchAgentTransport = await getOpenSearchClientTransport({
                context,
                dataSourceId: updatedParagraph.dataSourceMDSId,
              });
              const { body } = await osDeepResearchAgentTransport.request({
                method: 'GET',
                path: '/_plugins/_ml/config/os_deep_research',
              });
              output.agent_id = body.configuration.agent_id;
            } catch (error) {
              // Add error catch here..
            }
          }

          if (!output.agent_id) {
            throw new Error('No deep research agent id configured.');
          }
          updatedParagraph.dateModified = new Date().toISOString();
          const allContext = await Promise.all(
            paragraphs.slice(0, index).map(async (paragraph) => {
              const transport = await getOpenSearchClientTransport({
                context,
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
          const contextContent = [getNotebookTopLevelContextPrompt(notebookinfo), ...allContext]
            .filter((item) => item)
            .map((item) => item)
            .join('\n');
          const currentParagraphTransport = await getOpenSearchClientTransport({
            context,
            dataSourceId: paragraphs[index].dataSourceMDSId,
          });
          const baseMemoryId = notebookinfo.attributes.savedNotebook.context?.memoryId;
          const payload = {
            method: 'POST',
            path: `/_plugins/_ml/agents/${output.agent_id}/_execute`,
            querystring: 'async=true',
            body: {
              parameters: {
                question: paragraphs[index].input.inputText,
                planner_prompt_template:
                  '${parameters.tools_prompt} \n ${parameters.planner_prompt} \n Objective: ${parameters.user_prompt} \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n',
                planner_with_history_template:
                  '${parameters.tools_prompt} \n ${parameters.planner_prompt} \n Objective: ```${parameters.user_prompt}``` \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n You have currently executed the following steps: \n[${parameters.completed_steps}] \n\n',
                reflect_prompt_template:
                  '${parameters.tools_prompt} \n ${parameters.planner_prompt} \n Objective: ```${parameters.user_prompt}``` \n\n Original plan:\n[${parameters.steps}] \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n You have currently executed the following steps from the original plan: \n[${parameters.completed_steps}] \n\n ${parameters.reflect_prompt} \n\n.',
                context: contextContent,
                executor_system_prompt: `${EXECUTOR_SYSTEM_PROMPT} \n You have currently executed the following steps: \n ${contextContent}`,
                memory_id: baseMemoryId,
              },
            },
          };
          const { body } = await currentParagraphTransport.request(payload);
          deepResearchAgentUpdateParagraph.output = [
            {
              outputType: 'DEEP_RESEARCH',
              result: {
                taskId: body.task_id,
                memoryId: body.response?.memory_id,
                agent_id: output.agent_id,
              },
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];

          // FIXME: this is used for debug
          deepResearchAgentUpdateParagraph.input.parameters =
            updatedParagraph.input.parameters || {};
          deepResearchAgentUpdateParagraph.input.parameters.PERAgentInput = payload;
          deepResearchAgentUpdateParagraph.input.parameters.PERAgentContext = contextContent;
        } else if (formatNotRecognized(paragraphs[index].input.inputText)) {
          updatedParagraph.output = [
            {
              outputType: 'MARKDOWN',
              result: 'Please select an input type (%sql, %ppl, or %md)',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        }
      }
      updatedParagraphs.push(updatedParagraph as ParagraphBackendType<TOutput>);
    }
    return updatedParagraphs;
  } catch (error) {
    throw new Error('Running Paragraph Error:' + error);
  }
}

export function updateParagraphs<TOutput, IInputParameters>(
  paragraphs: Array<ParagraphBackendType<unknown>>,
  paragraphId: string,
  input: ParagraphBackendType<TOutput, IInputParameters>['input'],
  dataSourceMDSId?: string,
  paragraphOutput?: ParagraphBackendType<TOutput, IInputParameters>['output']
) {
  try {
    const updatedParagraphs: Array<ParagraphBackendType<TOutput, IInputParameters>> = [];
    paragraphs.map((paragraph) => {
      const updatedParagraph = { ...paragraph } as ParagraphBackendType<TOutput, IInputParameters>;
      if (paragraph.id === paragraphId) {
        updatedParagraph.dataSourceMDSId = dataSourceMDSId ?? paragraph.dataSourceMDSId;
        updatedParagraph.dateModified = new Date().toISOString();
        updatedParagraph.input = input;
        if (paragraphOutput) {
          updatedParagraph.output = paragraphOutput;
        }
      }
      updatedParagraphs.push(updatedParagraph);
    });
    return updatedParagraphs;
  } catch (error) {
    throw new Error('Update Paragraph Error:' + error);
  }
}

export async function updateFetchParagraph<TOutput, TInputParameters>(
  params: {
    noteId: string;
    paragraphId: string;
    input: ParagraphBackendType<TOutput, TInputParameters>['input'];
    dataSourceMDSId?: string;
    output?: ParagraphBackendType<TOutput, TInputParameters>['output'];
  },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  try {
    const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
    const updatedInputParagraphs = updateParagraphs(
      notebookinfo.attributes.savedNotebook.paragraphs,
      params.paragraphId,
      params.input,
      params.dataSourceMDSId,
      params.output
    );

    const updateNotebook = {
      paragraphs: updatedInputParagraphs,
      dateModified: new Date().toISOString(),
    };
    await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, params.noteId, {
      savedNotebook: updateNotebook,
    });
    let resultParagraph = {};
    updatedInputParagraphs.map((paragraph) => {
      if (params.paragraphId === paragraph.id) {
        resultParagraph = paragraph;
      }
    });
    return resultParagraph;
  } catch (error) {
    throw new Error('update Paragraph Error:' + error);
  }
}
