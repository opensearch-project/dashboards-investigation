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
import { ManagementOverViewPluginSetup } from '../../../src/plugins/management_overview/public';
import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { VisualizationsSetup } from '../../../src/plugins/visualizations/public';
import {
  ContentManagementPluginSetup,
  ContentManagementPluginStart,
} from '../../../src/plugins/content_management/public/types';
import { ExpressionsStart } from '../../../src/plugins/expressions/public';
import { CoreStart } from '../../../src/core/public';
import PPLService from './services/requests/ppl';

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
  savedObjectsClient: SavedObjectsClient;
  data: DataPublicPluginStart;
  securityDashboards?: {};
  dataSource: DataSourcePluginStart;
  contentManagement?: ContentManagementPluginStart;
  expressions: ExpressionsStart;
}

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  uiActions: UiActionsStart;
  managementOverview?: ManagementOverViewPluginSetup;
  dataSource: DataSourcePluginSetup;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  contentManagement?: ContentManagementPluginSetup;
}

export type NoteBookServices = CoreStart &
  AppPluginStartDependencies & {
    appName: string;
    pplService: PPLService;
  };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InvestigationSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InvestigationStart {}
