/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiGlobalToastList, EuiLink } from '@elastic/eui';
import { Toast } from '@elastic/eui/src/components/toast/global_toast_list';
import React, { ReactChild } from 'react';
// eslint-disable-next-line @osd/eslint/module_migration
import { Route, Switch } from 'react-router';
import { HashRouter } from 'react-router-dom';
import {
  ChromeBreadcrumb,
  CoreStart,
  MountPoint,
  SavedObjectsStart,
} from '../../../../../../src/core/public';
import { DashboardStart } from '../../../../../../src/plugins/dashboard/public';
import { DataSourceManagementPluginSetup } from '../../../../../../src/plugins/data_source_management/public';
import {
  NOTEBOOKS_API_PREFIX,
  NOTEBOOKS_DOCUMENTATION_URL,
} from '../../../../common/constants/notebooks';
import { isValidUUID } from './helpers/notebooks_parser';
import { NoteTable } from './note_table';
import { Notebook } from './notebook';
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

interface MainProps {
  DashboardContainerByValueRenderer: DashboardStart['DashboardContainerByValueRenderer'];
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  dataSourceEnabled: boolean;
  dataSourceManagement: DataSourceManagementPluginSetup;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  savedObjectsMDSClient: SavedObjectsStart;
  chrome: CoreStart['chrome'];
}

interface MainState {
  defaultMDSId: string;
  defaultMDSLabel: string;
}

export interface NotebookType {
  path: string;
  id: string;
  dateCreated: string;
  dateModified: string;
}

export class Main extends React.Component<MainProps, MainState> {
  constructor(props: Readonly<MainProps>) {
    super(props);
    this.state = {
      defaultMDSId: '',
      defaultMDSLabel: '',
    };
  }

  // Deletes existing notebooks
  deleteNotebook = async (notebookList: string[], toastMessage?: string) => {
    const deleteNotebook = (id: string) => {
      const isValid = isValidUUID(id);
      const route = isValid
        ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${id}`
        : `${NOTEBOOKS_API_PREFIX}/note/${id}`;
      return this.props.http.delete(route).then((res) => {
        return res;
      });
    };

    const promises = notebookList.map((id) =>
      deleteNotebook(id).catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error deleting notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      })
    );

    Promise.allSettled(promises)
      .then(() => {
        const message =
          toastMessage || `Notebook${notebookList.length > 1 ? 's' : ''} successfully deleted!`;
        this.props.notifications.toasts.addSuccess(message);
      })
      .catch((err) => {
        console.error('Error in deleting multiple notebooks', err);
      });
  };

  render() {
    return (
      <HashRouter>
        <>
          <Switch>
            <Route
              exact
              path={['/create', '/']}
              render={(_props) => (
                <NoteTable
                  deleteNotebook={this.deleteNotebook}
                  dataSourceManagement={this.props.dataSourceManagement}
                  notifications={this.props.notifications}
                  dataSourceEnabled={this.props.dataSourceEnabled}
                  savedObjectsMDSClient={this.props.savedObjectsMDSClient}
                  http={this.props.http}
                />
              )}
            />
            <Route
              exact
              path="/:id"
              render={(props) => (
                <Notebook
                  openedNoteId={props.match.params.id}
                  DashboardContainerByValueRenderer={this.props.DashboardContainerByValueRenderer}
                  http={this.props.http}
                  dataSourceManagement={this.props.dataSourceManagement}
                  setActionMenu={this.props.setActionMenu}
                  notifications={this.props.notifications}
                  dataSourceEnabled={this.props.dataSourceEnabled}
                  savedObjectsMDSClient={this.props.savedObjectsMDSClient}
                />
              )}
            />
          </Switch>
        </>
      </HashRouter>
    );
  }
}
