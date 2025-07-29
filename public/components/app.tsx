/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { I18nProvider } from '@osd/i18n/react';
import React from 'react';
import { CoreStart } from '../../../../src/core/public';
import { DataSourceManagementPluginSetup } from '../../../../src/plugins/data_source_management/public';
import { AppPluginStartDependencies } from '../types';
import { Main as NotebooksHome } from './notebooks/components/main';

interface ObservabilityAppDeps {
  CoreStartProp: CoreStart;
  DepsStart: AppPluginStartDependencies;
  dataSourceEnabled: boolean;
  dataSourceManagement: DataSourceManagementPluginSetup;
  savedObjectsMDSClient: CoreStart['savedObjects'];
}

const pages = {
  notebooks: NotebooksHome,
};

export const App = ({
  CoreStartProp,
  DepsStart,
  dataSourceManagement,
  dataSourceEnabled,
  savedObjectsMDSClient,
}: ObservabilityAppDeps) => {
  const { chrome, http, notifications, savedObjects: _coreSavedObjects } = CoreStartProp;

  const ModuleComponent = pages.notebooks;

  return (
    <I18nProvider>
      <ModuleComponent
        http={http}
        chrome={chrome}
        notifications={notifications}
        DashboardContainerByValueRenderer={DepsStart.dashboard.DashboardContainerByValueRenderer}
        dataSourceManagement={dataSourceManagement}
        dataSourceEnabled={dataSourceEnabled}
        savedObjectsMDSClient={savedObjectsMDSClient}
      />
    </I18nProvider>
  );
};
