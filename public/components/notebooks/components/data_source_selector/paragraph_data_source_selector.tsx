/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NoteBookServices } from 'public/types';
import { getDataSourceManagementSetup } from '../../../../services';
import { DataSourceSelectorProps } from '../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

export const ParagraphDataSourceSelector = (
  props: Omit<DataSourceSelectorProps, 'savedObjectsClient' | 'notifications'> & {
    selectedDataSourceId?: string;
  }
) => {
  const {
    services: { savedObjects, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const DataSourceSelector: React.ComponentType<DataSourceSelectorProps> =
    (getDataSourceManagementSetup()?.dataSourceManagement?.ui
      .DataSourceSelector as React.ComponentType<DataSourceSelectorProps>) || (() => <></>);
  return (
    <DataSourceSelector
      {...props}
      savedObjectsClient={savedObjects.client}
      notifications={notifications.toasts}
      onSelectedDataSource={props.onSelectedDataSource}
      defaultOption={
        props.selectedDataSourceId !== undefined ? [{ id: props.selectedDataSourceId }] : undefined
      }
    />
  );
};
