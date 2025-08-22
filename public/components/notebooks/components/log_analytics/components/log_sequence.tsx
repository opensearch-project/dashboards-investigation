/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiTableFieldDataColumnType,
  EuiText,
} from '@elastic/eui';
import { LogSequenceEntry } from '../../../../../../common/types/log_pattern';
import { SequenceItem } from './sequence_item';
import { LogAnalyticsLoadingPanel } from './log_analytics_loading_panel';

interface LogSequenceProps {
  exceptionalSequences?: LogSequenceEntry;
  baselineSequences?: LogSequenceEntry;
  isLoadingLogSequence: boolean;
}

export const LogSequence: React.FC<LogSequenceProps> = ({
  exceptionalSequences,
  isLoadingLogSequence,
}) => {
  // Helper function to convert map to array for table rendering
  const convertMapToSequenceArray = (
    map: { [key: string]: string } | undefined
  ): LogSequenceEntry[] => {
    if (!map) return [];
    return Object.entries(map).map(([traceId, sequence]) => ({
      traceId,
      sequence,
    }));
  };

  // Columns for sequence entries table
  const sequenceColumns: Array<EuiTableFieldDataColumnType<LogSequenceEntry>> = [
    {
      field: 'traceId',
      name: 'Trace ID',
      render: (traceId: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {traceId}
        </EuiCodeBlock>
      ),
      width: '30%',
    },
    {
      field: 'sequence',
      name: 'Log Sequence',
      render: (sequence: string) => {
        const sequenceItems = sequence
          ? sequence
              .split('->')
              .map((item) => item.trim())
              .filter((item) => item)
          : [];

        return (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {sequenceItems.length > 0 ? (
              <ol>
                {sequenceItems.map((item, index) => (
                  <SequenceItem key={index} item={item} index={index} />
                ))}
              </ol>
            ) : (
              <EuiText size="s" color="subdued">
                No sequence data
              </EuiText>
            )}
          </div>
        );
      },
      width: '70%',
    },
  ];

  const exceptionalArray = convertMapToSequenceArray(exceptionalSequences);

  const renderSection = () => {
    const title = 'Exceptional Sequences';
    const emptyMessage = 'No exceptional log sequences detected during the analysis period.';
    return (
      <>
        {exceptionalArray.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            title={<h4>No {title.toLowerCase()} found</h4>}
            body={<p>{emptyMessage}</p>}
          />
        ) : (
          <EuiBasicTable
            items={exceptionalArray}
            columns={sequenceColumns}
            tableCaption={title}
            noItemsMessage={emptyMessage}
          />
        )}
      </>
    );
  };

  return (
    <LogAnalyticsLoadingPanel
      isLoading={isLoadingLogSequence}
      title="Exceptional Sequences"
      initialIsOpen={false}
      renderSection={renderSection}
    />
  );
};
