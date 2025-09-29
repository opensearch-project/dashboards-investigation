/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvestigationConfig } from 'server';
import { NotebookBackendType, NotebookType } from '../../../common/types/notebooks';
import { SavedObject, SavedObjectsClientContract } from '../../../../../src/core/server/types';
import { NOTEBOOK_SAVED_OBJECT } from '../../../common/types/observability_saved_object_attributes';
import { getSampleNotebooks } from '../../../server/common/helpers/notebooks/sample_notebooks';

export function fetchNotebooks(
  savedObjectNotebooks: Array<SavedObject<{ savedNotebook: NotebookBackendType }>>,
  userName?: string,
  config?: InvestigationConfig
) {
  const notebooks: Array<{
    dateCreated: string;
    dateModified: string;
    path: string;
    id: string;
  }> = [];
  savedObjectNotebooks.forEach((savedObject) => {
    if (savedObject.type === 'observability-notebook' && savedObject.attributes.savedNotebook) {
      const notebookOwner = savedObject.attributes.savedNotebook.owner;
      const shouldFilterByOwner = userName && notebookOwner && notebookOwner !== userName;
      if (shouldFilterByOwner) return;

      if (
        !config?.agenticFeaturesEnabled &&
        savedObject.attributes.savedNotebook.context?.notebookType === NotebookType.AGENTIC
      )
        return;

      notebooks.push({
        dateCreated: savedObject.attributes.savedNotebook.dateCreated,
        dateModified: savedObject.attributes.savedNotebook.dateModified,
        path: savedObject.attributes.savedNotebook.name,
        id: savedObject.id,
        notebookType:
          savedObject.attributes.savedNotebook.context?.notebookType || NotebookType.CLASSIC,
      });
    }
  });

  return notebooks;
}

export function createNotebook(notebookName: { name: string; context?: any }, userName?: string) {
  const noteObject = {
    dateCreated: new Date().toISOString(),
    name: notebookName.name,
    dateModified: new Date().toISOString(),
    backend: '.kibana_1.0',
    paragraphs: [],
    path: notebookName.name,
    context: notebookName?.context ?? undefined,
  };

  if (userName) {
    noteObject.owner = userName;
  }

  return {
    savedNotebook: noteObject,
  };
}

export function cloneNotebook(fetchedNotebook: NotebookBackendType, name: string) {
  const noteObject = {
    dateCreated: new Date().toISOString(),
    name,
    dateModified: new Date().toISOString(),
    backend: 'kibana_1.0',
    paragraphs: fetchedNotebook.paragraphs,
    path: name,
  };

  return {
    savedNotebook: noteObject,
  };
}

export function renameNotebook(noteBookObj: { name: string; noteId: string }) {
  const noteObject = {
    name: noteBookObj.name,
    dateModified: new Date().toISOString(),
    path: noteBookObj.name,
  };

  return {
    savedNotebook: noteObject,
  };
}

export async function addSampleNotes(
  opensearchNotebooksClient: SavedObjectsClientContract,
  visIds: string[]
) {
  const notebooks = getSampleNotebooks(visIds);
  const sampleNotebooks = [];
  try {
    for (const item of notebooks) {
      const createdNotebooks = await opensearchNotebooksClient.create(NOTEBOOK_SAVED_OBJECT, item);
      sampleNotebooks.push({
        dateCreated: createdNotebooks.attributes.savedNotebook.dateCreated,
        dateModified: createdNotebooks.attributes.savedNotebook.dateModified,
        name: createdNotebooks.attributes.savedNotebook.name,
        id: createdNotebooks.id,
        path: createdNotebooks.attributes.savedNotebook.name,
      });
    }

    return { status: 'OK', message: '', body: sampleNotebooks };
  } catch (error) {
    console.log('error', error);
    throw new Error('Update Sample Notebook error' + error);
  }
}
