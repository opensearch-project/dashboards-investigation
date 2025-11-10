/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import {
  IOpenSearchDashboardsResponse,
  IRouter,
  OpenSearchDashboardsRequest,
  ResponseError,
  HttpAuth,
} from '../../../../../src/core/server';
import { SavedObjectsClientContract } from '../../../../../src/core/server/types';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { NOTEBOOK_SAVED_OBJECT } from '../../../common/types/observability_saved_object_attributes';
import {
  addSampleNotes,
  cloneNotebook,
  createNotebook,
  fetchNotebooks,
  renameNotebook,
} from '../../adaptors/notebooks/saved_objects_notebooks_router';
import { getCapabilities } from '../../../server/services/get_set';
import { fetchNotebook } from '../../adaptors/notebooks/saved_objects_paragraphs_router';

export function registerNoteRoute(router: IRouter, auth: HttpAuth) {
  const getUserName = (request: OpenSearchDashboardsRequest) => {
    const authInfo = auth.get<{
      authInfo?: {
        user_name?: string;
      };
    }>(request);
    return authInfo?.state?.authInfo?.user_name;
  };

  router.get(
    {
      path: `${NOTEBOOKS_API_PREFIX}/savedNotebook`,
      validate: {},
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const notebooksData = await opensearchNotebooksClient.find({
          type: NOTEBOOK_SAVED_OBJECT,
          perPage: 1000,
        });
        const userName = getUserName(request);
        const capabilities = await getCapabilities().resolveCapabilities(request);
        const agenticFeaturesEnabled = capabilities.investigation.agenticFeaturesEnabled;

        const fetchedNotebooks = fetchNotebooks(
          notebooksData.saved_objects as any,
          userName,
          agenticFeaturesEnabled
        );
        return response.ok({
          body: {
            data: fetchedNotebooks,
          },
        });
      } catch (error) {
        console.log('Notebook:', error);
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
      validate: {
        body: schema.object({
          name: schema.string(),
          context: schema.maybe(schema.any()),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const userName = getUserName(request);
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      let notebooksData;
      try {
        const newNotebookObject = createNotebook(request.body, userName);
        notebooksData = await opensearchNotebooksClient.create(
          NOTEBOOK_SAVED_OBJECT,
          newNotebookObject
        );
        return response.ok({
          body: `${notebooksData.id}`,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  router.put(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/updateNotebookContext`,
      validate: {
        body: schema.object({
          notebookId: schema.string(),
          context: schema.maybe(schema.any()),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;

      try {
        const { notebookId, context: newContext } = request.body;

        const noteObject = {
          context: newContext,
          dateModified: new Date().toISOString(),
        };

        const updatedNotebook = await opensearchNotebooksClient.update(
          NOTEBOOK_SAVED_OBJECT,
          notebookId,
          {
            savedNotebook: noteObject,
          }
        );

        return response.ok({
          body: {
            id: updatedNotebook.id,
          },
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to update notebook context: ${error.message}`,
            error: error.name,
          },
        });
      }
    }
  );

  router.put(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/updateHypotheses`,
      validate: {
        body: schema.object({
          notebookId: schema.string(),
          hypotheses: schema.arrayOf(
            schema.object({
              id: schema.string(),
              title: schema.string(),
              description: schema.string(),
              likelihood: schema.number(),
              supportingFindingParagraphIds: schema.arrayOf(schema.string()),
              newAddedFindingIds: schema.maybe(schema.arrayOf(schema.string())),
              dateCreated: schema.string(),
              dateModified: schema.string(),
            })
          ),
          runningMemory: schema.nullable(
            schema.object({
              executorMemoryId: schema.maybe(schema.string()),
              parentInteractionId: schema.maybe(schema.string()),
              memoryContainerId: schema.maybe(schema.string()),
            })
          ),
          historyMemory: schema.nullable(
            schema.object({
              executorMemoryId: schema.maybe(schema.string()),
              parentInteractionId: schema.maybe(schema.string()),
              memoryContainerId: schema.maybe(schema.string()),
            })
          ),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const noteObject = {
          hypotheses: request.body.hypotheses,
          dateModified: new Date().toISOString(),
          ...(request.body.runningMemory
            ? { runningMemory: request.body.runningMemory }
            : { runningMemory: null }),
          ...(request.body.historyMemory
            ? { historyMemory: request.body.historyMemory }
            : { historyMemory: null }),
        };
        const noteBookInfo = await fetchNotebook(
          request.body.notebookId,
          opensearchNotebooksClient
        );
        noteBookInfo.attributes.savedNotebook = {
          ...noteBookInfo.attributes.savedNotebook,
          ...noteObject,
        };
        const updateResponse = await opensearchNotebooksClient.create(
          NOTEBOOK_SAVED_OBJECT,
          noteBookInfo.attributes,

          { id: request.body.notebookId, overwrite: true, version: noteBookInfo.version }
        );
        return response.ok({
          body: updateResponse,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to hypotheses: ${error.message}`,
            error: error.name,
          },
        });
      }
    }
  );

  router.get(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/{noteId}`,
      validate: {
        params: schema.object({
          noteId: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const notebookinfo = await opensearchNotebooksClient.get(
          NOTEBOOK_SAVED_OBJECT,
          request.params.noteId
        );
        return response.ok({
          body: notebookinfo.attributes.savedNotebook,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/clone`,
      validate: {
        body: schema.object({
          name: schema.string(),
          noteId: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const getNotebook = await opensearchNotebooksClient.get(
          NOTEBOOK_SAVED_OBJECT,
          request.body.noteId
        );
        const createCloneNotebook = cloneNotebook(
          getNotebook.attributes.savedNotebook,
          request.body.name
        );
        const createdNotebook = await opensearchNotebooksClient.create(
          NOTEBOOK_SAVED_OBJECT,
          createCloneNotebook
        );
        return response.ok({
          body: createdNotebook,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );
  router.put(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/rename`,
      validate: {
        body: schema.object({
          name: schema.string(),
          noteId: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const renamedNotebook = renameNotebook(request.body);
        const updatedNotebook = await opensearchNotebooksClient.update(
          NOTEBOOK_SAVED_OBJECT,
          request.body.noteId,
          renamedNotebook
        );
        return response.ok({
          body: updatedNotebook,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  router.delete(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/{noteId}`,
      validate: {
        params: schema.object({
          noteId: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;

      try {
        const deletedNotebooks = await opensearchNotebooksClient.delete(
          NOTEBOOK_SAVED_OBJECT,
          request.params.noteId
        );
        return response.ok({
          body: deletedNotebooks,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/addSampleNotebooks`,
      validate: {
        body: schema.object({
          visIds: schema.arrayOf(schema.string()),
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      const opensearchNotebooksClient: SavedObjectsClientContract =
        context.core.savedObjects.client;
      try {
        const sampleNotebooks = await addSampleNotes(
          opensearchNotebooksClient,
          request.body.visIds,
          request.body.dataSourceId
        );
        return response.ok({
          body: sampleNotebooks,
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );
}
