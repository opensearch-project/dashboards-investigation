/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiPagination,
  EuiPanel,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { i18n } from '@osd/i18n';
import {
  AnomalyVisualizationAnalysisOutputResult,
  NoteBookSource,
} from '../../../../../common/types/notebooks';
import { NoteBookServices } from '../../../../types';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldECharts, EChartsChartData } from './render_data_distribution_echarts';
import { EChartsChart } from './echarts_chart';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { DATA_DISTRIBUTION_PARAGRAPH_TYPE } from '../../../../../common/constants/notebooks';

const ITEMS_PER_PAGE = 3;

interface MemoItemProps {
  uniqueId: string;
  chartIndex: number;
  isSelected: boolean;
  chartData: EChartsChartData;
}

export const DataDistributionContainer = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<AnomalyVisualizationAnalysisOutputResult>;
}) => {
  const {
    services: { notifications, paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const context = useContext(NotebookReactContext);
  const topContextValue = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );
  const paragraph = useObservable(paragraphState.getValue$());
  const { result } = ParagraphState.getOutput(paragraph)! || {};
  const { fieldComparison } = result! || {};
  const { timeRange, timeField, index, source } = topContextValue;
  const { saveParagraph } = context.paragraphHooks;
  const [activePage, setActivePage] = useState(0);
  const [distributionModalExpand, setDistributionModalExpand] = useState(false);
  const [isUpdatingParagraph, setIsUpdatingParagraph] = useState(false);
  const paragraphRegistry = paragraphService?.getParagraphRegistry(
    DATA_DISTRIBUTION_PARAGRAPH_TYPE
  );
  const { fetchDataLoading, distributionLoading, error } =
    paragraph?.uiState?.dataDistribution || {};

  const dataDistributionCharts = useMemo(() => {
    if (fieldComparison) {
      return generateAllFieldECharts(fieldComparison, source);
    }
    return [];
  }, [fieldComparison, source]);

  useEffect(() => {
    if (
      error ||
      fieldComparison ||
      fetchDataLoading ||
      distributionLoading ||
      !paragraph ||
      paragraph.uiState?.isRunning
    ) {
      return;
    }

    paragraphRegistry?.runParagraph({
      paragraphState,
      notebookStateValue: context.state.value,
    });
  }, [
    paragraphRegistry,
    fieldComparison,
    fetchDataLoading,
    distributionLoading,
    paragraph,
    error,
    paragraphState,
    context.state.value,
  ]);

  const { paginatedCharts, totalPages } = useMemo(() => {
    if (!dataDistributionCharts?.length) {
      return { paginatedCharts: [], totalPages: 0 };
    }

    const start = activePage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      paginatedCharts: dataDistributionCharts.slice(start, end),
      totalPages: Math.ceil(dataDistributionCharts.length / ITEMS_PER_PAGE),
    };
  }, [dataDistributionCharts, activePage]);

  if (!context || !timeRange || !timeField || !index || !paragraphRegistry || !paragraph) {
    return null;
  }

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
          source: NoteBookSource.DISCOVER,
        },
      })}
    </EuiText>
  );

  const dataDistributionLoadingSpinner = (fetchDataLoading || distributionLoading) && (
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

  const excludeButton = (chartIndex: number, isSelected: boolean) => {
    return (
      <div style={{ paddingLeft: '10px' }}>
        <EuiToolTip content={isSelected ? 'Exclude from the results' : 'Select from the results'}>
          <EuiSmallButtonIcon
            iconType={isSelected ? 'crossInCircleEmpty' : 'checkInCircleEmpty'}
            color="text"
            style={{ height: '16px', width: '16px' }}
            isDisabled={isUpdatingParagraph}
            onClick={async () => {
              try {
                setIsUpdatingParagraph(true);

                const updatedFieldComparison = [...fieldComparison];
                updatedFieldComparison[chartIndex] = {
                  ...fieldComparison[chartIndex],
                  excludeFromContext: !isSelected,
                };
                await saveParagraph({
                  paragraphStateValue: ParagraphState.updateOutputResult(paragraph, {
                    fieldComparison: updatedFieldComparison || [],
                  }),
                });
              } catch (err) {
                notifications.toasts.addDanger(
                  i18n.translate('notebook.data.distribution.paragraph.error', {
                    defaultMessage: 'Error updating paragraph',
                  })
                );
              } finally {
                setIsUpdatingParagraph(false);
              }
            }}
            aria-label={isSelected ? 'Exclude from the results' : 'Select from the results'}
          />
        </EuiToolTip>
      </div>
    );
  };

  const BASE_FLEX_ITEM_STYLE = { minHeight: 300, minWidth: 300 };
  const MemoItem: React.FC<MemoItemProps> = React.memo(
    ({ chartIndex, isSelected, chartData }: MemoItemProps) => {
      const itemStyle = useMemo(
        () => ({
          ...BASE_FLEX_ITEM_STYLE,
          maxWidth: `${100 / ITEMS_PER_PAGE}%`,
          opacity: isSelected ? 0.5 : 1,
        }),
        [isSelected]
      );
      return (
        <EuiFlexItem grow={true} style={itemStyle}>
          <EChartsChart option={chartData.option} height={280} />
          {excludeButton(chartIndex, isSelected)}
        </EuiFlexItem>
      );
    }
  ) as React.FC<MemoItemProps>;

  const chartsVis = !fetchDataLoading && !distributionLoading && (
    <EuiPanel hasShadow={false} borderRadius="l">
      {paginatedCharts.length ? (
        <>
          <EuiFlexGroup wrap responsive={false}>
            {paginatedCharts.map((chartData, chartIdx) => {
              const uniqueId = `dis-id-${activePage * ITEMS_PER_PAGE + chartIdx}`;
              const chartIndex = activePage * ITEMS_PER_PAGE + chartIdx;
              const isSelected = !!fieldComparison[chartIndex].excludeFromContext;

              return (
                <MemoItem
                  key={uniqueId}
                  uniqueId={uniqueId}
                  chartIndex={chartIndex}
                  isSelected={isSelected}
                  chartData={chartData}
                />
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
        </>
      ) : (
        <EuiEmptyPrompt iconType="database" title={<h2>No data distribution available</h2>} />
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
          {dataDistributionCharts.map((chartData, chartIdx) => {
            const uniqueKey = `dis-modal-key-${chartIdx}`;
            const isSelected = !!fieldComparison[chartIdx].excludeFromContext;

            return (
              <EuiFlexItem key={uniqueKey} style={{ opacity: isSelected ? 0.5 : 1, height: 300 }}>
                <EChartsChart option={chartData.option} height={280} />
                {excludeButton(chartIdx, isSelected)}
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </EuiModalBody>
    </EuiModal>
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{dataDistributionTitle}</EuiFlexItem>
        {dataDistributionCharts.length > 0 && (
          <EuiFlexItem grow={false} className="notebookDataDistributionParaExpandButton">
            <EuiButtonIcon
              onClick={() => setDistributionModalExpand(true)}
              iconType="expand"
              aria-label="Next"
              size="s"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {dataDistributionSubtitle}
      <EuiSpacer size="s" />
      {error ? (
        <EuiCallOut title="Error" color="danger">
          <p>{error}</p>
        </EuiCallOut>
      ) : (
        <>
          {dataDistributionLoadingSpinner}
          {chartsVis}
          {distributionModal}
        </>
      )}
    </EuiPanel>
  );
};
