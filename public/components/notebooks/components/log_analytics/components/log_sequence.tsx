/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiIcon,
  EuiSpacer,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { LogSequenceEntry } from '../../../../../../common/types/log_pattern';
import { SequenceItem } from './sequence_item';

interface LogSequenceProps {
  exceptionalSequences?: LogSequenceEntry;
  baselineSequences?: LogSequenceEntry;
}

export const LogSequence: React.FC<LogSequenceProps> = ({
  exceptionalSequences,
  baselineSequences,
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
        <EuiText size="s" style={{ fontFamily: 'monospace' }}>
          {traceId}
        </EuiText>
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

  const renderSection = (
    title: string,
    data: LogSequenceEntry[],
    columns: Array<EuiTableFieldDataColumnType<LogSequenceEntry>>,
    emptyMessage: string,
    iconType: string,
    iconColor?: string,
    isOpen?: boolean
  ) => {
    return (
      <EuiAccordion
        id={title.toLowerCase().replace(/\s+/g, '')}
        buttonContent={
          <EuiTitle size="xs">
            <h4>
              <EuiIcon type={iconType} color={iconColor} />
              &nbsp;{title} ({data.length})
            </h4>
          </EuiTitle>
        }
        initialIsOpen={isOpen || false}
      >
        <EuiSpacer size="s" />
        {data.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            title={<h4>No {title.toLowerCase()} found</h4>}
            body={<p>{emptyMessage}</p>}
          />
        ) : (
          <EuiBasicTable
            items={data}
            columns={columns}
            tableCaption={title}
            noItemsMessage={emptyMessage}
          />
        )}
      </EuiAccordion>
    );
  };

  const exceptionalArray = convertMapToSequenceArray(exceptionalSequences);
  const baselineArray = convertMapToSequenceArray(baselineSequences);

  return (
    <>
      {renderSection(
        'Exceptional Sequences',
        exceptionalArray,
        sequenceColumns,
        'No exceptional log sequences detected during the analysis period.',
        'alert',
        'danger',
        exceptionalArray.length > 0
      )}

      <EuiSpacer size="m" />

      {renderSection(
        'Baseline Sequences',
        baselineArray,
        sequenceColumns,
        'No baseline log sequences available for comparison.',
        'timeline',
        undefined,
        false
      )}
    </>
  );
};
