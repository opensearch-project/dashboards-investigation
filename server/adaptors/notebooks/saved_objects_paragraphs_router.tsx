/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import now from 'performance-now';
import { v4 as uuid } from 'uuid';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
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
import { getOpenSearchClientTransport } from '../../routes/utils';
import { executePERAgentInParagraph } from '../../common/helpers/notebooks/per_agent';

export function createParagraph<T>({
  input,
  dataSourceMDSId,
  aiGenerated,
}: {
  input: ParagraphBackendType<string, T>['input'];
  dataSourceMDSId?: string;
  aiGenerated?: boolean;
}) {
  const finalInput = { ...input };
  try {
    let paragraphType = finalInput.inputType;
    const { inputText, inputType } = finalInput;
    if (inputType === 'CODE') {
      if (inputText.substring(0, 3) === '%sql' || inputText.substring(0, 3) === '%ppl') {
        paragraphType = 'QUERY';
      } else {
        paragraphType = 'MARKDOWN';
      }
    } else if (inputType === AI_RESPONSE_TYPE) {
      paragraphType = DEEP_RESEARCH_PARAGRAPH_TYPE;
    }

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
      input: finalInput,
      output: outputObjects,
      dataSourceMDSId,
      aiGenerated,
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
    aiGenerated?: boolean;
  },
  opensearchNotebooksClient: SavedObjectsClientContract
) {
  const notebookInfo = await fetchNotebook(params.noteId, opensearchNotebooksClient);
  const paragraphs = notebookInfo.attributes.savedNotebook.paragraphs;
  const newParagraph = createParagraph({
    input: params.input,
    dataSourceMDSId: params.dataSourceMDSId,
    aiGenerated: params.aiGenerated,
  });
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
    if (notebookContext && notebookContext.initialGoal) {
      const firstDeepResearchParagraph = updatedOutputParagraphs.find(
        ({ input }) => input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE
      );
      const targetParagraph = updatedOutputParagraphs.find(
        ({ id }) => id === params.paragraphId
      ) as ParagraphBackendType<DeepResearchOutputResult> | undefined;
      if (
        firstDeepResearchParagraph?.id === targetParagraph?.id &&
        targetParagraph?.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE &&
        targetParagraph?.output?.[0]?.outputType === DEEP_RESEARCH_PARAGRAPH_TYPE
      ) {
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
      const inputType = getInputType(updatedParagraph);
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
        } else if (inputType === 'VISUALIZATION') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'VISUALIZATION',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (inputType === 'OBSERVABILITY_VISUALIZATION') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'OBSERVABILITY_VISUALIZATION',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (inputType === 'LOG_PATTERN') {
          updatedParagraph.dateModified = new Date().toISOString();
          updatedParagraph.output = [
            {
              outputType: 'LOG_PATTERN',
              result: '',
              execution_time: `${(now() - startTime).toFixed(3)} ms`,
            },
          ];
        } else if (inputType === DEEP_RESEARCH_PARAGRAPH_TYPE || inputType === AI_RESPONSE_TYPE) {
          const transport = await getOpenSearchClientTransport({
            context,
            dataSourceId: updatedParagraph.dataSourceMDSId,
          });
          const isDeepResearchParagraph = inputType === DEEP_RESEARCH_PARAGRAPH_TYPE;
          let baseMemoryId = isDeepResearchParagraph
            ? notebookinfo.attributes.savedNotebook.context?.memoryId
            : undefined;
          // Always use fresh memory for first deep research paragraph rerun
          if (
            isDeepResearchParagraph &&
            !!baseMemoryId &&
            !paragraphs
              .slice(0, index)
              .some((item) => item.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE)
          ) {
            baseMemoryId = undefined;
          }

          const newParagraph = await executePERAgentInParagraph({
            transport,
            paragraph: updatedParagraph as ParagraphBackendType<
              unknown,
              DeepResearchInputParameters
            >,
            baseMemoryId,
          });
          updatedParagraph.dateModified = newParagraph.dateModified;
          updatedParagraph.input = newParagraph.input;
          updatedParagraph.output = newParagraph.output;
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
