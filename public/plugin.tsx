/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import React from 'react';
import { first } from 'rxjs/operators';
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
  setNotifications,
  setVisualizations,
  FindingService,
} from './services';
import {
  ClassicNotebook,
  ClassicNotebookProps,
} from './components/notebooks/components/classic_notebook';
import { NOTEBOOK_APP_NAME } from '../common/constants/notebooks';
import { OpenSearchDashboardsContextProvider } from '../../../src/plugins/opensearch_dashboards_react/public';
import { paragraphRegistry } from './paragraphs';
import { ContextService } from './services/context_service';
import { ChatContext, ISuggestionProvider } from '../../dashboards-assistant/public';
import { NoteBookAssistantContext } from '../common/types/assistant_context';
import { createInvestigateLogActionComponent } from './components/notebooks/components/discover_explorer';
import { StartInvestigateButton } from './components/notebooks/components/discover_explorer/start_investigate_button';

export class InvestigationPlugin
  implements
    Plugin<InvestigationSetup, InvestigationStart, SetupDependencies, AppPluginStartDependencies> {
  private paragraphService: ParagraphService;
  private contextService: ContextService;
  private startDeps: AppPluginStartDependencies | undefined;

  constructor() {
    this.paragraphService = new ParagraphService();
    this.contextService = new ContextService();
  }

  public async setup(
    core: CoreSetup<AppPluginStartDependencies>,
    setupDeps: SetupDependencies
  ): Promise<InvestigationSetup> {
    uiSettingsService.init(core.uiSettings, core.notifications);
    setOSDHttp(core.http);
    core.getStartServices().then(([coreStart]) => {
      setOSDSavedObjectsClient(coreStart.savedObjects.client);
    });

    // Setup paragraph service
    const paragraphServiceSetup = this.paragraphService.setup();

    // Register paragraph types
    paragraphRegistry.forEach(({ types, item }) => {
      paragraphServiceSetup.register(types, item);
    });
    const contextServiceSetup = await this.contextService.setup();

    const findingService = new FindingService();

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
        contextService: contextServiceSetup,
        updateContext: this.updateContext,
        findingService,
      };
      return services;
    };

    const appMountWithStartPage = () => async (params: AppMountParameters) => {
      const { Observability } = await import('./components/index');
      const services = await getServices();
      return Observability({ ...services, appMountService: params }, params!);
    };

    setupDeps.assistantDashboards?.registerSuggestionProvider?.({
      id: 'finding',
      priority: 1,
      isEnabled: () => true,
      getSuggestions: async (context: ChatContext) => {
        const [coreStart] = await core.getStartServices();
        const currentAppId = await coreStart.application.currentAppId$.pipe(first()).toPromise();
        if (
          currentAppId !== investigationNotebookID ||
          !findingService.currentNotebookId ||
          !context.currentMessage ||
          !context.currentMessage.content
        ) {
          return [];
        }

        return [
          {
            actionType: 'customize',
            message: 'Add current result to investigation as a finding',
            action: async () => {
              const input = context.messageHistory.findLast((message) => message.type === 'input')
                ?.content;
              const output = context.currentMessage?.content;

              const notebookId = context.pageContext?.['notebookId'];

              if (input && output) {
                try {
                  await findingService.addFinding(input, output, notebookId);
                  return true;
                } catch (error) {
                  // Return false to indicate failure to the suggestion system
                  return false;
                }
              }
              return false;
            },
          },
        ];
      },
    } as ISuggestionProvider);

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

    // TODO: check if we need to expose agentic notebook
    const getNotebook = async ({ openedNoteId }: Pick<ClassicNotebookProps, 'openedNoteId'>) => {
      const services = await getServices();

      return (
        <OpenSearchDashboardsContextProvider services={services}>
          <ClassicNotebook openedNoteId={openedNoteId} />
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
    setNotifications(core.notifications);
    setVisualizations(startDeps.visualizations);
    this.startDeps = startDeps;

    startDeps.explore?.logActionRegistry.registerAction({
      id: 'investigate-single',
      displayName: i18n.translate('investigate.logAction.investigate-single', {
        defaultMessage: 'Investigate',
      }),
      iconType: 'notebookApp',
      order: 100,
      isCompatible: () => true,
      component: createInvestigateLogActionComponent({
        services: {
          data: startDeps.data,
          http: core.http,
          application: core.application,
        },
      }),
    });

    startDeps.explore?.slotRegistry.register({
      id: 'start-investigate-all',
      order: 10,
      slotType: 'resultsActionBar',
      render: () => {
        return (
          <OpenSearchDashboardsContextProvider
            services={{
              data: startDeps.data,
              http: core.http,
              application: core.application,
            }}
          >
            <StartInvestigateButton />
          </OpenSearchDashboardsContextProvider>
        );
      },
    });

    return {};
  }

  private updateContext = (id: string, chatConetxt: NoteBookAssistantContext | undefined) => {
    const contextStore = this.startDeps?.contextProvider?.getAssistantContextStore();
    if (!contextStore) return;
    contextStore.removeContextById(id);
    if (chatConetxt) {
      chatConetxt.id = id;
      contextStore.addContext(chatConetxt);
    }
  };

  public stop() {}
}
