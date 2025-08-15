/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import {
  investigationNotebookID,
  investigationNotebookPluginOrder,
  investigationNotebookTitle,
} from '../common/constants/shared';
import { setOSDHttp, setOSDSavedObjectsClient, uiSettingsService } from '../common/utils';
import { registerAllPluginNavGroups } from './plugin_helpers/plugin_nav';
import PPLService from './services/requests/ppl';
import {
  AppPluginStartDependencies,
  InvestigationSetup,
  InvestigationStart,
  NoteBookServices,
  SetupDependencies,
} from './types';

import './index.scss';
import { BubbleUpEmbeddableFactory } from './components/notebooks/components/bubbleup/embeddable/BubbleUpEmbeddableFactory';
import {
  setApplication,
  setClient,
  setData,
  setDataSourceManagementSetup,
  setEmbeddable,
  setExpressions,
  setSearch,
} from './services';
import { Notebook, NotebookProps } from './components/notebooks/components/notebook';
import { NOTEBOOK_APP_NAME } from '../common/constants/notebooks';
import { OpenSearchDashboardsContextProvider } from '../../../src/plugins/opensearch_dashboards_react/public';

export class InvestigationPlugin
  implements
    Plugin<InvestigationSetup, InvestigationStart, SetupDependencies, AppPluginStartDependencies> {
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    setupDeps: SetupDependencies
  ): InvestigationSetup {
    uiSettingsService.init(core.uiSettings, core.notifications);
    setOSDHttp(core.http);
    core.getStartServices().then(([coreStart]) => {
      setOSDSavedObjectsClient(coreStart.savedObjects.client);
    });

    const getServices = async () => {
      const [coreStart, depsStart] = await core.getStartServices();
      const pplService: PPLService = new PPLService(core.http);
      const services: NoteBookServices = {
        ...coreStart,
        ...depsStart,
        appName: NOTEBOOK_APP_NAME,
        pplService,
        savedObjects: coreStart.savedObjects,
      };
      return services;
    };

    const appMountWithStartPage = () => async (params: AppMountParameters) => {
      const { Observability } = await import('./components/index');
      const services = await getServices();
      return Observability(services, params!);
    };

    core.application.register({
      id: investigationNotebookID,
      title: investigationNotebookTitle,
      order: investigationNotebookPluginOrder,
      mount: appMountWithStartPage(),
    });

    registerAllPluginNavGroups(core);

    setupDeps.embeddable.registerEmbeddableFactory(
      'vega_visualization',
      new BubbleUpEmbeddableFactory()
    );

    setDataSourceManagementSetup(
      !!setupDeps.dataSourceManagement
        ? {
            enabled: true,
            dataSourceManagement: setupDeps.dataSourceManagement,
          }
        : {
            enabled: false,
            dataSourceManagement: undefined,
          }
    );

    const getNotebook = async ({ openedNoteId }: Pick<NotebookProps, 'openedNoteId'>) => {
      const services = await getServices();

      return (
        <OpenSearchDashboardsContextProvider services={services}>
          <Notebook openedNoteId={openedNoteId} />
        </OpenSearchDashboardsContextProvider>
      );
    };
    // Return methods that should be available to other plugins
    return {
      ui: {
        getNotebook,
      },
    };
  }

  public start(core: CoreStart, startDeps: AppPluginStartDependencies): InvestigationStart {
    setExpressions(startDeps.expressions);
    setData(startDeps.data);
    setSearch(startDeps.data.search);
    setClient(core.http);
    setEmbeddable(startDeps.embeddable);
    setApplication(core.application);

    // Export so other plugins can use this flyout
    return {};
  }

  public stop() {}
}
