/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { NoteBookServices } from 'public/types';
import { EuiFlexGroup, EuiLoadingSpinner, EuiSmallButtonIcon } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getDataSourceManagementSetup } from '../../../../services';
import { useNotebook } from '../../../../../public/hooks/use_notebook';
import { DataSourceOption } from '../../../../../../../src/plugins/data_source_management/public';
import { dataSourceFilterFn } from '../../../../../common/utils/shared';

export const NotebookDataSourceSelector: React.FC<{
  dataSourceId: string | undefined;
  isNotebookLoading: boolean;
}> = ({ dataSourceId, isNotebookLoading }) => {
  const {
    services: { savedObjects, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { updateNotebookContext } = useNotebook();
  const { dataSourceManagement } = getDataSourceManagementSetup();

  const [isUpdating, setIsUpdating] = useState(false);
  const selectedDataSourceId = useRef<string | undefined>(undefined);

  const DataSourceMenu = useMemo(() => dataSourceManagement?.ui.getDataSourceMenu(), [
    dataSourceManagement,
  ]);

  const handleSaveDataSource = useCallback(async () => {
    setIsUpdating(true);
    await updateNotebookContext({ dataSourceId: selectedDataSourceId.current });
    setIsUpdating(false);
  }, [updateNotebookContext]);

  const dataSourceConfig = useMemo(
    () => ({
      savedObjects: savedObjects.client,
      activeOption: [{ id: dataSourceId }],
    }),
    [savedObjects.client, dataSourceId]
  );

  const selectableConfig = useMemo(
    () => ({
      savedObjects: savedObjects.client,
      notifications,
      onSelectedDataSources: (ds: DataSourceOption[]) => {
        if (ds[0] && ds[0].id !== selectedDataSourceId.current) {
          selectedDataSourceId.current = ds[0].id;
        }
      },
      dataSourceFilter: dataSourceFilterFn,
    }),
    [savedObjects.client, notifications]
  );

  if (isNotebookLoading) {
    return null;
  }

  if (dataSourceId || dataSourceId === '') {
    // Empty string is refer to local cluster and is a valid data source
    return (
      <>
        {DataSourceMenu && (
          <DataSourceMenu componentType="DataSourceView" componentConfig={dataSourceConfig} />
        )}
      </>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      {DataSourceMenu && (
        <DataSourceMenu componentType="DataSourceSelectable" componentConfig={selectableConfig} />
      )}
      {isUpdating ? (
        <EuiLoadingSpinner style={{ marginInline: 8 }} />
      ) : (
        <EuiSmallButtonIcon
          aria-label="Save selected data source"
          iconType="returnKey"
          onClick={handleSaveDataSource}
        />
      )}
    </EuiFlexGroup>
  );
};
