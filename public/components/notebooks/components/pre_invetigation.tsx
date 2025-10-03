/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiTitle,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiFlexGrid,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { NoteBookSource } from '../../../../common/types/notebooks';
import { EmbeddableRenderer } from '../../../../../../src/plugins/embeddable/public';
import { NoteBookServices } from '../../../types';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { DataDistributionInput } from './data_distribution/embeddable/types';
import { generateAllFieldCharts } from './data_distribution/render_data_distribution_vega';
import { SummaryStatistics } from './log_analytics/components/summary_statistics';
import { LogInsight } from './log_analytics/components/log_insight';
import { PatternDifference } from './log_analytics/components/pattern_difference';
import { LogSequence } from './log_analytics/components/log_sequence';
import { useDataDistribution } from './data_distribution/hooks/use_data_distribution';
import { useLogPatternAnalysis } from './log_analytics/hooks/useLogPatternAnalysis';

export interface PreInvestigationAnalysisProps {
  source: NoteBookSource;
  index: string;
  timeRange: {
    selectionFrom: number;
    selectionTo: number;
    baselineFrom: number;
    baselineTo: number;
  };
  timeField: string;
  dataSourceId: string;
  filters: Array<Record<string, any>>;
  variables: {
    pplQuery?: string;
    alert?: {
      start_time: string;
      last_notification_time: string;
      severity: string;
      monitor_id: string;
      alertNumber: number;
      trigger_name: string;
      monitor_name: string;
    };
    [key: string]: unknown;
  };
  logMessageField?: string;
  traceIdField?: string;
}

const ITEMS_PER_PAGE = 3;

export const PreInvestigationAnalysis: React.FC<PreInvestigationAnalysisProps> = ({
  timeRange,
  timeField,
  index,
  dataSourceId,
  filters,
  source,
  variables,
  logMessageField,
  traceIdField,
}) => {
  const [activePage, setActivePage] = useState(0);
  const [distributionModalExpand, setDistributionModalExpand] = useState(false);

  const {
    services: { embeddable, notifications, http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const factory = embeddable.getEmbeddableFactory<DataDistributionInput>('vega_visualization');

  const { dataDistribution, fetchDataLoading, distributionLoading } = useDataDistribution({
    source,
    index,
    timeRange,
    timeField,
    dataSourceId,
    filters,
    variables,
    notifications,
  });

  const analysisParameters = useMemo(
    () => ({
      dataSourceId,
      index,
      timeField,
      timeRange,
      // TODO: Call index insight API the get real result
      indexInsight: {
        index_name: index,
        is_log_index: true, // No need for this value
        log_message_field: logMessageField,
        trace_id_field: traceIdField,
        time_field: timeField,
      },
    }),
    [dataSourceId, index, timeField, timeRange, logMessageField, traceIdField]
  );

  const {
    result: logPatternAnalysisResult,
    loadingStatus,
    error: logPatternError,
  } = useLogPatternAnalysis(http, analysisParameters, undefined, undefined);

  const dataDistributionSpecs = useMemo(() => {
    if (dataDistribution && dataDistribution.length > 0) {
      return generateAllFieldCharts(dataDistribution, source);
    }
    return [];
  }, [dataDistribution, source]);

  const { paginatedSpecs, totalPages } = useMemo(() => {
    if (!dataDistributionSpecs?.length) {
      return { paginatedSpecs: [], totalPages: 0 };
    }

    const start = activePage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      paginatedSpecs: dataDistributionSpecs.slice(start, end),
      totalPages: Math.ceil(dataDistributionSpecs.length / ITEMS_PER_PAGE),
    };
  }, [dataDistributionSpecs, activePage]);

  const dataDistributionTitle = (
    <EuiTitle size="s">
      <h3>
        {i18n.translate('notebook.data.distribution.paragraph.title', {
          defaultMessage: 'Data distribution analysis',
        })}
      </h3>
    </EuiTitle>
  );

  const dataDistributionSubtitle = (
    <EuiText size="s" color="subdued">
      {i18n.translate('notebook.data.distribution.paragraph.subtitle', {
        defaultMessage: 'Visualization the values for key fields associated with the {source}',
        values: {
          source: source === NoteBookSource.DISCOVER ? 'discover' : 'alert',
        },
      })}
    </EuiText>
  );

  const dataDistributionLoadingSpinner = (distributionLoading || fetchDataLoading) && (
    <EuiPanel hasShadow={false} borderRadius="l" paddingSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="m">
            {fetchDataLoading
              ? i18n.translate('notebook.data.distribution.paragraph.loading.step1', {
                  defaultMessage: 'Step 1/2: Fetching data from index',
                })
              : i18n.translate('notebook.data.distribution.paragraph.loading.step2', {
                  defaultMessage: 'Step 2/2: Analyzing data distribution',
                })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const specsVis = (
    <EuiPanel hasShadow={false} borderRadius="l">
      <EuiFlexGroup>
        {paginatedSpecs.map((spec, specIndex) => {
          const uniqueKey = `${activePage * ITEMS_PER_PAGE + specIndex}`;
          const uniqueId = `dis-id-${activePage * ITEMS_PER_PAGE + specIndex}`;

          return (
            <EuiFlexItem grow={false} key={uniqueKey} style={{ height: 300, width: 300 }}>
              {factory && spec && (
                <EmbeddableRenderer
                  factory={factory}
                  input={{
                    id: uniqueId,
                    savedObjectId: '',
                    visInput: { spec },
                  }}
                />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {totalPages > 1 && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiPagination
              pageCount={totalPages}
              activePage={activePage}
              onPageClick={setActivePage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );

  const distributionModal = distributionModalExpand && (
    <EuiModal onClose={() => setDistributionModalExpand(false)} style={{ minWidth: 1000 }}>
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>{dataDistributionTitle}</EuiFlexItem>
          <EuiFlexItem grow={false}>{dataDistributionSubtitle}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGrid columns={3} gutterSize="m">
          {dataDistributionSpecs.map((spec, specIndex) => {
            const uniqueKey = `dis-modal-key-${specIndex}`;
            const uniqueId = `dis-modal-id-${specIndex}`;

            return (
              <EuiFlexItem key={uniqueKey} style={{ height: 300 }}>
                {factory && spec && (
                  <EmbeddableRenderer
                    factory={factory}
                    input={{
                      id: uniqueId,
                      savedObjectId: '',
                      visInput: { spec },
                    }}
                  />
                )}
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </EuiModalBody>
    </EuiModal>
  );

  return (
    <>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        {index && (
          <>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('notebook.log.sequence.paragraph.title', {
                  defaultMessage: 'Log sequence analysis',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {i18n.translate('notebook.log.sequence.paragraph.subtitle', {
                defaultMessage:
                  'Analyzing log patterns from {index} index by comparing two time periods',
                values: {
                  index,
                },
              })}
            </EuiText>
          </>
        )}

        {logPatternError && (
          <EuiCallOut title="Error" color="danger">
            <p>{logPatternError}</p>
          </EuiCallOut>
        )}

        <EuiSpacer size="m" />

        {/* Summary Statistics */}
        <SummaryStatistics result={logPatternAnalysisResult} />
        <EuiSpacer size="m" />

        {/* Log Insights Section */}
        <LogInsight
          logInsights={logPatternAnalysisResult?.logInsights || []}
          isLoadingLogInsights={loadingStatus.isLoadingLogInsights}
        />

        <EuiSpacer size="s" />

        {/* Pattern Differences Section */}
        <PatternDifference
          patternMapDifference={logPatternAnalysisResult?.patternMapDifference || []}
          isLoadingPatternMapDifference={loadingStatus.isLoadingPatternMapDifference}
          isNotApplicable={!timeRange?.baselineFrom}
        />

        <EuiSpacer size="s" />

        {/* Log Sequences Section */}
        <LogSequence
          exceptionalSequences={logPatternAnalysisResult?.EXCEPTIONAL}
          baselineSequences={logPatternAnalysisResult?.BASE}
          isLoadingLogSequence={loadingStatus.isLoadingLogSequence}
          isNotApplicable={!(timeRange?.baselineFrom && traceIdField)}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{dataDistributionTitle}</EuiFlexItem>
          {dataDistributionSpecs.length > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  onClick={() => setDistributionModalExpand(true)}
                  iconType="expand"
                  aria-label="Next"
                  size="s"
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
        {dataDistributionSubtitle}
        <EuiSpacer size="s" />
        <>
          {dataDistributionLoadingSpinner}
          {specsVis}
          {distributionModal}
        </>
      </EuiPanel>
    </>
  );
};
