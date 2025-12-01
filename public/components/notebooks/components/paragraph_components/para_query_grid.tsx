/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiDataGrid,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface QueryDataGridProps {
  rowCount: number;
  queryColumns: any[];
  dataValues: any[];
}

interface RenderCellValueProps {
  rowIndex: number;
  columnId: string;
}

function QueryDataGrid(props: QueryDataGridProps) {
  const { rowCount, queryColumns, dataValues } = props;
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((newPagination) => ({
        ...newPagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );

  const onChangePage = useCallback(
    (pageIndex) => setPagination((newPagination) => ({ ...newPagination, pageIndex })),
    [setPagination]
  );

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: RenderCellValueProps) => {
      return dataValues.hasOwnProperty(rowIndex) ? dataValues[rowIndex][columnId] : null;
    };
  }, [dataValues]);

  const getUpdatedVisibleColumns = useCallback(() => {
    const updatedVisibleColumns = [];
    for (let index = 0; index < queryColumns.length; ++index) {
      updatedVisibleColumns.push(queryColumns[index].displayAsText);
    }
    return updatedVisibleColumns;
  }, [queryColumns]);

  useEffect(() => {
    setVisibleColumns(getUpdatedVisibleColumns());
  }, [getUpdatedVisibleColumns]);

  const dataGridComponent = (
    <EuiDataGrid
      aria-label="Query datagrid"
      columns={queryColumns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={rowCount}
      renderCellValue={renderCellValue}
      pagination={{
        ...pagination,
        pageSizeOptions: [10, 20, 50],
        onChangeItemsPerPage,
        onChangePage,
      }}
      height={isModalVisible ? '' : '400px'}
      toolbarVisibility={{
        showFullScreenSelector: false,
        ...(!isModalVisible && {
          additionalControls: (
            <EuiButtonEmpty
              size="xs"
              color="text"
              onClick={() => setIsModalVisible(true)}
              iconType="fullScreen"
            >
              Full screen
            </EuiButtonEmpty>
          ),
        }),
      }}
    />
  );

  return (
    <>
      <div id="queryDataGrid">{dataGridComponent}</div>
      {isModalVisible && (
        <EuiModal
          onClose={() => setIsModalVisible(false)}
          maxWidth="90vw"
          style={{ width: '90vw' }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>Query Results</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>{dataGridComponent}</EuiModalBody>
        </EuiModal>
      )}
    </>
  );
}

function queryDataGridPropsAreEqual(prevProps: QueryDataGridProps, nextProps: QueryDataGridProps) {
  return (
    prevProps.rowCount === nextProps.rowCount &&
    JSON.stringify(prevProps.queryColumns) === JSON.stringify(nextProps.queryColumns) &&
    JSON.stringify(prevProps.dataValues) === JSON.stringify(nextProps.dataValues)
  );
}

export const QueryDataGridMemo = React.memo(QueryDataGrid, queryDataGridPropsAreEqual);
