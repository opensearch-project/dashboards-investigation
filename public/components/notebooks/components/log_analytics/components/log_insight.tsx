/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiPopover,
  EuiSpacer,
  EuiTableFieldDataColumnType,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { LogPattern } from '../../../../../../common/types/log_pattern';
import { LogAnalyticsLoadingPanel } from './log_analytics_loading_panel';

interface LogInsightProps {
  logInsights: LogPattern[];
  isLoadingLogInsights: boolean;
  onExclude?: (item: LogPattern) => void;
}

export const LogInsight: React.FC<LogInsightProps> = ({
  logInsights,
  isLoadingLogInsights,
  onExclude,
}) => {
  const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({});

  const togglePopover = (id: string) => {
    setOpenPopovers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const closePopover = (id: string) => {
    setOpenPopovers((prev) => ({
      ...prev,
      [id]: false,
    }));
  };
  // Columns for log insights table
  const logInsightsColumns: Array<EuiTableFieldDataColumnType<LogPattern>> = [
    {
      field: 'pattern',
      name: 'Log template',
      render: (pattern: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ),
      width: '50%',
    },
    {
      field: 'count',
      name: 'Count',
      render: (count: number) => <EuiBadge color="primary">{count}</EuiBadge>,
      width: '10%',
    },
    {
      field: 'sampleLogs',
      name: 'Examples',
      render: (examples: string[], record: LogPattern) => {
        const popoverId = `examples-${record.pattern.replace(/[^a-zA-Z0-9]/g, '')}-${record.count}`;

        return (
          <EuiPopover
            id={popoverId}
            button={
              <EuiButtonIcon
                iconType="inspect"
                aria-label="View examples"
                onClick={() => togglePopover(popoverId)}
              />
            }
            isOpen={openPopovers[popoverId] || false}
            closePopover={() => closePopover(popoverId)}
            panelPaddingSize="s"
          >
            <div style={{ maxWidth: '400px', maxHeight: '300px', overflowY: 'auto' }}>
              <EuiTitle size="xs">
                <h4>Log Examples</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              {examples?.slice(0, 10).map((example, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
                    {example}
                  </EuiCodeBlock>
                </div>
              ))}
            </div>
          </EuiPopover>
        );
      },
      width: '10%',
    },
    ...(onExclude
      ? [
          {
            field: '',
            name: 'Actions',
            render: (record: LogPattern) => (
              <EuiToolTip content="Exclude from the results">
                <EuiButtonIcon
                  key={`deselect-${record.pattern}-${record.count}`}
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
    if (!logInsights || logInsights.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h4>No log insights found</h4>}
          body={<p>No log insights patterns were detected in the analysis.</p>}
        />
      );
    }

    return (
      <EuiBasicTable
        items={logInsights}
        columns={logInsightsColumns}
        tableCaption="Log Insights"
        noItemsMessage="No log insights patterns were detected in the analysis."
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
    );
  };

  return (
    <LogAnalyticsLoadingPanel
      isLoading={isLoadingLogInsights}
      title="Log Insights Analysis"
      initialIsOpen={false}
      renderSection={renderSection}
    />
  );
};
