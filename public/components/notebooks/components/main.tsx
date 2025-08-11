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
import { Notebook } from './notebook';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookType } from '../../../../common/types/notebooks';
/*
 * "Main" component renders the whole Notebooks as a single page application
 *
 * Props taken in as params are:
 * DashboardContainerByValueRenderer: Dashboard container renderer for visualization
 * http object: for making API requests
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
      deleteNotebookFn(id).catch((err) => {
        notifications.toasts.addDanger(
          'Error deleting notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      })
    );

    Promise.allSettled(promises)
      .then(() => {
        const message =
          toastMessage || `Notebook${notebookList.length > 1 ? 's' : ''} successfully deleted!`;
        notifications.toasts.addSuccess(message);
      })
      .catch((err) => {
        console.error('Error in deleting multiple notebooks', err);
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
            exact
            path="/:id"
            render={(props) => {
              return <Notebook openedNoteId={props.match.params.id} />;
            }}
          />
        </Switch>
      </>
    </HashRouter>
  );
};
