/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsClient } from '../../../src/core/server';
import { DashboardStart } from '../../../src/plugins/dashboard/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../src/plugins/data/public';
import {
  DataSourcePluginSetup,
  DataSourcePluginStart,
} from '../../../src/plugins/data_source/public';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';
import { EmbeddableSetup, EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../src/plugins/visualizations/public';
import { ExpressionsStart } from '../../../src/plugins/expressions/public';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import PPLService from './services/requests/ppl';
import { ParagraphServiceSetup } from './services/paragraph_service';
import { ContextServiceSetup } from './services/context_service';
import { ContextProviderStart } from '../../../src/plugins/context_provider/public';
import { FindingService } from './services/finding_service';
import { NoteBookAssistantContext } from '../common/types/assistant_context';
import type { ExplorePluginSetup, ExplorePluginStart } from '../../../src/plugins/explore/public';
import {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../src/plugins/usage_collection/public';
import { ChatPluginSetup, ChatPluginStart } from '../../../src/plugins/chat/public';

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
  savedObjectsClient: SavedObjectsClient;
  data: DataPublicPluginStart;
  dataSource: DataSourcePluginStart;
  expressions: ExpressionsStart;
  visualizations: VisualizationsStart;
  contextProvider?: ContextProviderStart;
  explore?: ExplorePluginStart;
  usageCollection?: UsageCollectionStart;
  chat?: ChatPluginStart;
}

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  dataSource: DataSourcePluginSetup;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  explore?: ExplorePluginSetup;
  usageCollection?: UsageCollectionSetup;
  chat?: ChatPluginSetup;
}

export type NoteBookServices = CoreStart &
  AppPluginStartDependencies & {
    appName: string;
    pplService: PPLService;
    appMountService?: AppMountParameters;
    paragraphService: ParagraphServiceSetup;
    contextService: ContextServiceSetup;
    updateContext: (id: string, chatConetxt: NoteBookAssistantContext | undefined) => void;
    findingService: FindingService;
  };

export interface InvestigationSetup {
  ui: {
    getNotebook: (props: { openedNoteId: string }) => Promise<React.ReactElement>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InvestigationStart {}
