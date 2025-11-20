/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiDataGrid } from '@elastic/eui';
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

  return (
    <div id="queryDataGrid">
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
      />
    </div>
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
