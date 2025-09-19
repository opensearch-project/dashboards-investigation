/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import uuid from 'uuid';
import {
  IOpenSearchDashboardsResponse,
  IRouter,
  ResponseError,
} from '../../../../../src/core/server';
import { SavedObjectsClientContract } from '../../../../../src/core/server/types';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { NOTEBOOK_SAVED_OBJECT } from '../../../common/types/observability_saved_object_attributes';
import { HypothesisItem, NotebookBackendType } from '../../../common/types/notebooks';

export function registerHypothesisRoute(router: IRouter) {
  // Create Hypothesis
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/savedNotebook/{noteId}/hypothesis`,
      validate: {
        params: schema.object({
          noteId: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          likelihood: schema.number({ min: 1, max: 10 }),
          supportingFindingParagraphIds: schema.arrayOf(schema.string()),
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
        const { noteId } = request.params;
        const { title, description, likelihood, supportingFindingParagraphIds } = request.body;

        // Get existing notebook
        const notebookObject = await opensearchNotebooksClient.get(NOTEBOOK_SAVED_OBJECT, noteId);
        const notebook = notebookObject.attributes.savedNotebook as NotebookBackendType;

        // Create new hypothesis
        const newHypothesis: HypothesisItem = {
          id: 'hypothesis_' + uuid(),
          title,
          description,
          likelihood,
          supportingFindingParagraphIds,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        };

        // Add hypothesis to notebook
        const updatedNotebook = {
          ...notebook,
          hypotheses: [...(notebook.hypotheses || []), newHypothesis],
          dateModified: new Date().toISOString(),
        };

        await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, noteId, {
          savedNotebook: updatedNotebook,
        });

        return response.ok({
          body: newHypothesis,
        });
      } catch (error) {
        const statusCode =
          error.statusCode || error.output.statusCode || error.output.payload.statusCode;
        return response.custom({
          statusCode: statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  // Update Hypothesis
  router.put(
    {
      path: `${NOTEBOOKS_API_PREFIX}/savedNotebook/{noteId}/hypothesis/{hypothesisId}`,
      validate: {
        params: schema.object({
          noteId: schema.string(),
          hypothesisId: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          likelihood: schema.maybe(schema.number({ min: 1, max: 10 })),
          supportingFindingParagraphIds: schema.maybe(schema.arrayOf(schema.string())),
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
        const { noteId, hypothesisId } = request.params;
        const updates = request.body;

        // Get existing notebook
        const notebookObject = await opensearchNotebooksClient.get(NOTEBOOK_SAVED_OBJECT, noteId);
        const notebook = notebookObject.attributes.savedNotebook as NotebookBackendType;

        if (!notebook.hypotheses) {
          return response.notFound({
            body: 'Hypothesis not found',
          });
        }

        // Find and update hypothesis
        const hypothesisIndex = notebook.hypotheses.findIndex((h) => h.id === hypothesisId);
        if (hypothesisIndex === -1) {
          return response.notFound({
            body: 'Hypothesis not found',
          });
        }

        const updatedHypothesis = {
          ...notebook.hypotheses[hypothesisIndex],
          ...updates,
          dateModified: new Date().toISOString(),
        };

        notebook.hypotheses[hypothesisIndex] = updatedHypothesis;

        const updatedNotebook = {
          ...notebook,
          dateModified: new Date().toISOString(),
        };

        await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, noteId, {
          savedNotebook: updatedNotebook,
        });

        return response.ok({
          body: updatedHypothesis,
        });
      } catch (error) {
        const statusCode =
          error.statusCode || error.output.statusCode || error.output.payload.statusCode;
        return response.custom({
          statusCode: statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  // Add findings to Hypothesis
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/savedNotebook/{noteId}/hypothesis/{hypothesisId}/findings`,
      validate: {
        params: schema.object({
          noteId: schema.string(),
          hypothesisId: schema.string(),
        }),
        body: schema.object({
          paragraphIds: schema.arrayOf(schema.string()),
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
        const { noteId, hypothesisId } = request.params;
        const { paragraphIds } = request.body;

        // Get existing notebook
        const notebookObject = await opensearchNotebooksClient.get(NOTEBOOK_SAVED_OBJECT, noteId);
        const notebook = notebookObject.attributes.savedNotebook as NotebookBackendType;

        if (!notebook.hypotheses) {
          return response.notFound({
            body: 'Hypothesis not found',
          });
        }

        // Find hypothesis
        const hypothesisIndex = notebook.hypotheses.findIndex((h) => h.id === hypothesisId);
        if (hypothesisIndex === -1) {
          return response.notFound({
            body: 'Hypothesis not found',
          });
        }

        // Add new paragraph IDs to existing ones (avoid duplicates)
        const existingIds = new Set(
          notebook.hypotheses[hypothesisIndex].supportingFindingParagraphIds
        );
        paragraphIds.forEach((id) => existingIds.add(id));

        const updatedHypothesis = {
          ...notebook.hypotheses[hypothesisIndex],
          supportingFindingParagraphIds: Array.from(existingIds),
          dateModified: new Date().toISOString(),
        };

        notebook.hypotheses[hypothesisIndex] = updatedHypothesis;

        const updatedNotebook = {
          ...notebook,
          dateModified: new Date().toISOString(),
        };

        await opensearchNotebooksClient.update(NOTEBOOK_SAVED_OBJECT, noteId, {
          savedNotebook: updatedNotebook,
        });

        return response.ok({
          body: updatedHypothesis,
        });
      } catch (error) {
        const statusCode =
          error.statusCode || error.output.statusCode || error.output.payload.statusCode;
        return response.custom({
          statusCode: statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  // Get all hypotheses for a notebook
  router.get(
    {
      path: `${NOTEBOOKS_API_PREFIX}/savedNotebook/{noteId}/hypotheses`,
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
        const { noteId } = request.params;

        // Get existing notebook
        const notebookObject = await opensearchNotebooksClient.get(NOTEBOOK_SAVED_OBJECT, noteId);
        const notebook = notebookObject.attributes.savedNotebook as NotebookBackendType;

        return response.ok({
          body: notebook.hypotheses || [],
        });
      } catch (error) {
        const statusCode =
          error.statusCode || error.output.statusCode || error.output.payload.statusCode;
        return response.custom({
          statusCode: statusCode || 500,
          body: error.message,
        });
      }
    }
  );
}
