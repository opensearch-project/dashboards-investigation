/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getCoreStart, getDataSourceManagementSetup } from '../../../../services';
import { DataSourceSelectorProps } from '../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';

export const ParagraphDataSourceSelector = (
  props: Omit<DataSourceSelectorProps, 'savedObjectsClient' | 'notifications'> & {
    selectedDataSourceId?: string;
  }
) => {
  const coreStart = getCoreStart();
  const DataSourceSelector: React.ComponentType<DataSourceSelectorProps> =
    (getDataSourceManagementSetup()?.dataSourceManagement?.ui
      .DataSourceSelector as React.ComponentType<DataSourceSelectorProps>) || (() => <></>);
  return (
    <DataSourceSelector
      {...props}
      savedObjectsClient={coreStart.savedObjects.client}
      notifications={coreStart.notifications}
      onSelectedDataSource={props.onSelectedDataSource}
      defaultOption={
        props.selectedDataSourceId !== undefined ? [{ id: props.selectedDataSourceId }] : undefined
      }
    />
  );
};
