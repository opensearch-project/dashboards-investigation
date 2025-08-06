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
import {
  DefaultOutput,
  DefaultParagraph,
} from '../../common/helpers/notebooks/default_notebook_schema';
import { formatNotRecognized, inputIsQuery } from '../../common/helpers/notebooks/query_helpers';
import { RequestHandlerContext } from '../../../../../src/core/server';
import { getInputType } from '../../../common/utils/paragraph';
import { updateParagraphText } from '../../common/helpers/notebooks/paragraph';
import { NotebookContext, ParagraphBackendType } from '../../../common/types/notebooks';
import { getNotebookTopLevelContextPrompt, getOpenSearchClientTransport } from '../../routes/utils';
import { getParagraphServiceSetup } from '../../services/get_set';

interface DeepResearchParagraphResult {
  taskId: string;
  memoryId?: string;
}

export function createNotebook(paragraphInput: string, inputType: string) {
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
    };
    const outputObjects: DefaultOutput[] = [
      {
        outputType: paragraphType,
        result: '',
        execution_time: '0s',
      },
    ];
    const newParagraph = {
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
    const notebook = await opensearchNotebooksClient.get(NOTEBOOK_SAVED_OBJECT, noteId);
    return notebook;
  } catch (error) {
    throw new Error('update Paragraph Error:' + error);
  }
}

export async function createParagraphs(
  params: { noteId: string; paragraphIndex: number; paragraphInput: string; inputType: string },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const paragraphs = notebookinfo.attributes.savedNotebook.paragraphs;
  const newParagraph = createNotebook(params.paragraphInput, params.inputType);
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

export async function clearParagraphs(
  params: { noteId: string },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const updatedparagraphs: DefaultParagraph[] = [];
  notebookinfo.attributes.savedNotebook.paragraphs.map((paragraph: DefaultParagraph) => {
    const updatedParagraph = { ...paragraph };
    updatedParagraph.output = [];
    updatedparagraphs.push(updatedParagraph);
  });
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
    throw new Error('Clear Paragraph Error:' + error);
  }
}

export async function deleteParagraphs(
  params: { noteId: string; paragraphId: string | undefined },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const updatedparagraphs: DefaultParagraph[] = [];
  if (params.paragraphId !== undefined) {
    notebookinfo.attributes.savedNotebook.paragraphs.map((paragraph: DefaultParagraph) => {
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

export async function updateRunFetchParagraph(
  params: {
    noteId: string;
    paragraphId: string;
    paragraphInput: string;
    paragraphType: string;
    dataSourceMDSId: string | undefined;
    dataSourceMDSLabel: string | undefined;
  },
  opensearchNotebooksClient: SavedObjectsClientContract,
  context: RequestHandlerContext
) {
  try {
    const notebookInfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
    const updatedInputParagraphs = updateParagraphs(
      notebookInfo.attributes.savedNotebook.paragraphs,
      params.paragraphId,
      params.paragraphInput,
      params.paragraphType,
      params.dataSourceMDSId,
      params.dataSourceMDSLabel
    );
    const updatedOutputParagraphs = await runParagraph(
      updatedInputParagraphs,
      params.paragraphId,
      context,
      notebookInfo
    );

    const updateNotebook: {
      paragraphs: Array<ParagraphBackendType<string | DeepResearchParagraphResult>>;
      dateModified: string;
      context?: NotebookContext;
    } = {
      paragraphs: updatedOutputParagraphs,
      dateModified: new Date().toISOString(),
    };
    const notebookContext = notebookInfo.attributes.savedNotebook?.context;
    if (notebookContext && !notebookContext.memoryId) {
      const targetParagraph = updatedOutputParagraphs.find(({ id }) => id === params.paragraphId);
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

export async function runParagraph(
  paragraphs: Array<ParagraphBackendType<string | { taskId: string; memoryId?: string }>>,
  paragraphId: string,
  context: RequestHandlerContext,
  notebookinfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>
) {
  try {
    const updatedParagraphs = [];
    let index = 0;
    for (index = 0; index < paragraphs.length; ++index) {
      const startTime = now();
      const updatedParagraph = { ...paragraphs[index] };
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
          let output: { agent_id: string } = { agent_id: '' };
          try {
            output = JSON.parse((updatedParagraph.output?.[0].result || '') as string);
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
                  '${parameters.planner_prompt} \n Objective: ${parameters.user_prompt} \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n${parameters.plan_execute_reflect_response_format}',
                planner_with_history_template:
                  '${parameters.planner_prompt} \n Objective: ${parameters.user_prompt} \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n You have currently executed the following steps: \n[${parameters.completed_steps}] \n\n ${parameters.plan_execute_reflect_response_format}',
                reflect_prompt_template:
                  '${parameters.planner_prompt} \n Objective: ${parameters.user_prompt} \n\n Original plan:\n[${parameters.steps}] \n\n Here are some steps user has executed to help you investigate: \n[${parameters.context}] \n\n You have currently executed the following steps: \n[${parameters.completed_steps}] \n\n ${parameters.reflect_prompt} \n\n ${parameters.plan_execute_reflect_response_format}',
                context: contextContent,
                executor_system_prompt: `${EXECUTOR_SYSTEM_PROMPT} \n You have currently executed the following steps: \n ${contextContent}`,
                memory_id: baseMemoryId,
              },
            },
          };
          const { body } = await currentParagraphTransport.request(payload);
          updatedParagraph.output = [
            {
              outputType: 'DEEP_RESEARCH',
              result: {
                taskId: body.task_id,
                memoryId: body.response?.memory_id,
              },
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];

          // FIXME: this is used for debug
          updatedParagraph.input.PERAgentInput = payload;
          updatedParagraph.input.PERAgentContext = contextContent;
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
      updatedParagraphs.push(updatedParagraph);
    }
    return updatedParagraphs;
  } catch (error) {
    throw new Error('Running Paragraph Error:' + error);
  }
}

export function updateParagraphs(
  paragraphs: DefaultParagraph[],
  paragraphId: string,
  paragraphInput?: string,
  paragraphType?: string,
  dataSourceMDSId?: string,
  dataSourceMDSLabel?: string,
  paragraphOutput?: DefaultOutput[]
) {
  try {
    const updatedParagraphs: DefaultParagraph[] = [];
    paragraphs.map((paragraph: DefaultParagraph) => {
      const updatedParagraph = { ...paragraph };
      if (paragraph.id === paragraphId) {
        updatedParagraph.dataSourceMDSId = dataSourceMDSId ?? paragraph.dataSourceMDSId;
        updatedParagraph.dataSourceMDSLabel = dataSourceMDSLabel ?? paragraph.dataSourceMDSId;
        updatedParagraph.dateModified = new Date().toISOString();
        if (paragraphInput) {
          updatedParagraph.input.inputText = paragraphInput;
        }
        if (paragraphType && paragraphType.length > 0) {
          updatedParagraph.input.inputType = paragraphType;
        }
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

export async function updateFetchParagraph(
  params: {
    noteId: string;
    paragraphId: string;
    paragraphInput: string;
    paragraphOutput?: DefaultOutput[];
  },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  try {
    const notebookinfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
    const updatedInputParagraphs = updateParagraphs(
      notebookinfo.attributes.savedNotebook.paragraphs,
      params.paragraphId,
      params.paragraphInput,
      undefined,
      undefined,
      undefined,
      params.paragraphOutput
    );

    const updateNotebook = {
      paragraphs: updatedInputParagraphs,
      dateModified: new Date().toISOString(),
    };
    await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, params.noteId, {
      savedNotebook: updateNotebook,
    });
    let resultParagraph = {};
    updatedInputParagraphs.map((paragraph: DefaultParagraph) => {
      if (params.paragraphId === paragraph.id) {
        resultParagraph = paragraph;
      }
    });
    return resultParagraph;
  } catch (error) {
    throw new Error('update Paragraph Error:' + error);
  }
}
