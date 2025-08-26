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
import { DataDistributionEmbeddableFactory } from './components/notebooks/components/data_distribution/embeddable/data_distribution_embeddable_factory';
import {
  setClient,
  setData,
  setDataSourceManagementSetup,
  setEmbeddable,
  setExpressions,
  setSearch,
  ParagraphService,
} from './services';
import { Notebook, NotebookProps } from './components/notebooks/components/notebook';
import {
  AI_RESPONSE_TYPE,
  DASHBOARDS_VISUALIZATION_TYPE,
  DATA_DISTRIBUTION_PARAGRAPH_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  NOTEBOOK_APP_NAME,
  OBSERVABILITY_VISUALIZATION_TYPE,
  OTHER_PARAGRAPH_TYPE,
} from '../common/constants/notebooks';
import { OpenSearchDashboardsContextProvider } from '../../../src/plugins/opensearch_dashboards_react/public';
import {
  DataDistributionParagraphItem,
  LogPatternParagraphItem,
  MarkdownParagraphItem,
  OtherParagraphItem,
  PERAgentParagraphItem,
  PPLParagraphItem,
  VisualizationParagraphItem,
} from './paragraphs';

export class InvestigationPlugin
  implements
    Plugin<InvestigationSetup, InvestigationStart, SetupDependencies, AppPluginStartDependencies> {
  private paragraphService: ParagraphService;

  constructor() {
    this.paragraphService = new ParagraphService();
  }
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    setupDeps: SetupDependencies
  ): InvestigationSetup {
    uiSettingsService.init(core.uiSettings, core.notifications);
    setOSDHttp(core.http);
    core.getStartServices().then(([coreStart]) => {
      setOSDSavedObjectsClient(coreStart.savedObjects.client);
    });

    // Setup paragraph service
    const paragraphServiceSetup = this.paragraphService.setup();

    // Register paragraph types
    paragraphServiceSetup.register(OTHER_PARAGRAPH_TYPE, OtherParagraphItem);
    paragraphServiceSetup.register(DATA_DISTRIBUTION_PARAGRAPH_TYPE, DataDistributionParagraphItem);
    paragraphServiceSetup.register(LOG_PATTERN_PARAGRAPH_TYPE, LogPatternParagraphItem);
    paragraphServiceSetup.register(
      [DEEP_RESEARCH_PARAGRAPH_TYPE, AI_RESPONSE_TYPE],
      PERAgentParagraphItem
    );
    paragraphServiceSetup.register(
      [
        DASHBOARDS_VISUALIZATION_TYPE.toUpperCase(),
        OBSERVABILITY_VISUALIZATION_TYPE.toUpperCase(),
        DASHBOARDS_VISUALIZATION_TYPE,
        OBSERVABILITY_VISUALIZATION_TYPE,
      ],
      VisualizationParagraphItem
    );
    paragraphServiceSetup.register(['ppl', 'sql'], PPLParagraphItem);
    paragraphServiceSetup.register('md', MarkdownParagraphItem);

    const getServices = async () => {
      const [coreStart, depsStart] = await core.getStartServices();
      const pplService: PPLService = new PPLService(core.http);
      const services: NoteBookServices = {
        ...coreStart,
        ...depsStart,
        appName: NOTEBOOK_APP_NAME,
        pplService,
        savedObjects: coreStart.savedObjects,
        paragraphService: paragraphServiceSetup,
      };
      return services;
    };

    const appMountWithStartPage = () => async (params: AppMountParameters) => {
      const { Observability } = await import('./components/index');
      const services = await getServices();
      return Observability({ ...services, appMountService: params }, params!);
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
      new DataDistributionEmbeddableFactory()
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

    // Export so other plugins can use this flyout
    return {};
  }

  public stop() {}
}
