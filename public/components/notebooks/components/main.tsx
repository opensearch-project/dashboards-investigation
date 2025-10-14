/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
// eslint-disable-next-line @osd/eslint/module_migration
import { Route, Switch } from 'react-router';
import { HashRouter } from 'react-router-dom';
import { NoteBookServices } from 'public/types';
import { NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { isValidUUID } from './helpers/notebooks_parser';
import { NoteTable } from './note_table';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookType } from '../../../../common/types/notebooks';
import { ClassicNotebook } from './classic_notebook';
import { AgenticNotebook } from './agentic_notebook';
/*
 * "Main" component renders the whole Notebooks as a single page application
 *
 * Props taken in as params are:
 *
 * Cell component of nteract used as a container for paragraphs in notebook UI.
 * https://components.nteract.io/#cell
 */

export interface NotebookInfo {
  path: string;
  id: string;
  dateCreated: string;
  dateModified: string;
  notebookType: NotebookType;
}

export const Main: React.FC = () => {
  const {
    services: { http, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();

  // Deletes existing notebooks
  const deleteNotebook = async (notebookList: string[], toastMessage?: string) => {
    const result = {
      succeeded: [] as string[],
      failed: [] as string[],
    };

    const deleteNotebookFn = (id: string) => {
      const isValid = isValidUUID(id);
      const route = isValid
        ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${id}`
        : `${NOTEBOOKS_API_PREFIX}/note/${id}`;
      return http.delete(route).then((res) => {
        return res;
      });
    };

    const promises = notebookList.map((id) =>
      deleteNotebookFn(id)
        .then(() => {
          result.succeeded.push(id);
        })
        .catch((err) => {
          result.failed.push(id);
          console.error(err.body.message);
        })
    );

    return Promise.allSettled(promises).then(() => {
      if (result.succeeded.length > 0) {
        const successMessage =
          toastMessage ||
          `${result.succeeded.length} notebook${
            result.succeeded.length > 1 ? 's' : ''
          } successfully deleted!`;
        notifications.toasts.addSuccess(successMessage);
      }

      if (result.failed.length > 0) {
        notifications.toasts.addDanger(
          `Error deleting ${result.failed.length} notebook${
            result.failed.length > 1 ? 's' : ''
          }, please make sure you have the correct permission.`
        );
      }
    });
  };

  return (
    <HashRouter>
      <>
        <Switch>
          <Route
            exact
            path={['/create', '/']}
            render={(_props) => <NoteTable deleteNotebook={deleteNotebook} />}
          />
          <Route
            path="/agentic/:id"
            render={(props) => {
              return <AgenticNotebook openedNoteId={props.match.params.id} showPageHeader />;
            }}
          />
          <Route
            path="/:id"
            render={(props) => {
              return <ClassicNotebook openedNoteId={props.match.params.id} showPageHeader />;
            }}
          />
        </Switch>
      </>
    </HashRouter>
  );
};
