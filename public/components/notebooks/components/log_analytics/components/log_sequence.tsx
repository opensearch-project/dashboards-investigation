/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { LogSequenceEntry } from '../../../../../../common/types/log_pattern';
import { SequenceItem } from './sequence_item';
import { LogAnalyticsLoadingPanel } from './log_analytics_loading_panel';

interface LogSequenceProps {
  exceptionalSequences?: LogSequenceEntry[];
  baselineSequences?: LogSequenceEntry[];
  isLoadingLogSequence: boolean;
  isNotApplicable: boolean;
  onExclude?: (item: LogSequenceEntry) => void;
}

export const LogSequence: React.FC<LogSequenceProps> = ({
  exceptionalSequences,
  isLoadingLogSequence,
  isNotApplicable,
  onExclude,
}) => {
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
                {sequenceItems.reverse().map((item, index) => (
                  <SequenceItem key={index} item={item} index={sequenceItems.length - index} />
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
    ...(onExclude
      ? [
          {
            field: '',
            name: 'Actions',
            render: (record: LogSequenceEntry) => (
              <EuiToolTip content="Exclude from the results">
                <EuiButtonIcon
                  key={`deselect-${record.traceId}`}
                  iconType="crossInCircleEmpty"
                  aria-label="Deselect item"
                  onClick={() => onExclude(record)}
                  color="subdued"
                />
              </EuiToolTip>
            ),
            width: '10%',
          },
        ]
      : []),
  ];

  const renderSection = () => {
    const title = 'Exceptional Sequences';
    const emptyMessage = isNotApplicable
      ? 'Log sequence detection is not applicable due to no baseline.'
      : 'No exceptional log sequences detected during the analysis period.';
    const emptyResultTitle = isNotApplicable ? 'Not applicable' : `No ${title.toLowerCase()} found`;
    return (
      <>
        {!exceptionalSequences || exceptionalSequences.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            title={<h4>{emptyResultTitle}</h4>}
            body={<p>{emptyMessage}</p>}
          />
        ) : (
          <EuiBasicTable
            items={exceptionalSequences}
            columns={sequenceColumns}
            tableCaption={title}
            noItemsMessage={emptyMessage}
            rowProps={(item) => ({
              style: item.excluded
                ? {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'var(--euiColorSubdued)',
                    opacity: 0.3,
                  }
                : undefined,
            })}
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
