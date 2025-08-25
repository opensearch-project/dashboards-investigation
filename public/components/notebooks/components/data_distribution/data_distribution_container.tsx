/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiPagination,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { i18n } from '@osd/i18n';
import {
  AnomalyVisualizationAnalysisOutputResult,
  NoteBookSource,
  SummaryDataItem,
} from '../../../../../common/types/notebooks';
import { NoteBookServices } from '../../../../types';
import { DataDistributionInput } from './embeddable/types';
import { EmbeddableRenderer } from '../../../../../../../src/plugins/embeddable/public';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_data_distribution_vega';
import { DataDistributionDataService } from './data_distribution_data_service';
import { useParagraphs } from '../../../../hooks/use_paragraphs';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import './data_distribution_viz.scss';

const ITEMS_PER_PAGE = 3;

export const DataDistributionContainer = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<AnomalyVisualizationAnalysisOutputResult>;
}) => {
  const {
    services: { embeddable, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const context = useContext(NotebookReactContext);
  const topContextValue = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );
  const paragraph = useObservable(paragraphState.getValue$());
  const { result } = ParagraphState.getOutput(paragraph)! || {};
  const { fieldComparison } = result! || {};
  const { timeRange, timeField, index, dataSourceId, filters, source, variables } = topContextValue;
  const { saveParagraph } = useParagraphs();
  const [activePage, setActivePage] = useState(0);
  const [fetchDataLoading, setFetchDataLoading] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [distributionModalExpand, setDistributionModalExpand] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const factory = embeddable.getEmbeddableFactory<DataDistributionInput>('vega_visualization');

  const dataDistributionSpecs = useMemo(() => {
    if (fieldComparison) {
      return generateAllFieldCharts(fieldComparison, source);
    }
    return [];
  }, [fieldComparison, source]);

  const dataService = useMemo(() => new DataDistributionDataService(), []);

  const loadDataDistribution = useCallback(async () => {
    try {
      setFetchDataLoading(true);
      setDistributionLoading(true);

      let dataDistribution: SummaryDataItem[];

      if (source === NoteBookSource.DISCOVER) {
        const pplData = await dataService.fetchPPlData(variables?.['pplQuery'] as string);
        setFetchDataLoading(false);
        dataDistribution = await dataService.getSingleDataDistribution(pplData);
      } else {
        const comparisonData = await dataService.fetchComparisonData({
          timeRange,
          selectionFilters: filters,
        });
        setFetchDataLoading(false);
        dataDistribution = await dataService.getComparisonDataDistribution(comparisonData);
      }

      if (paragraph) {
        await saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraph, {
            fieldComparison: dataDistribution || [],
          }),
        });
      }
    } catch (err) {
      setError(err.message);
      notifications.toasts.addDanger(`Initialize data distribution failed: ${err.message}`);
    } finally {
      setFetchDataLoading(false);
      setDistributionLoading(false);
    }
  }, [dataService, filters, paragraph, saveParagraph, notifications, source, timeRange, variables]);

  useEffect(() => {
    (async () => {
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

      await loadDataDistribution();
    })();
  }, [
    loadDataDistribution,
    fieldComparison,
    fetchDataLoading,
    distributionLoading,
    paragraph,
    error,
  ]);

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

  if (!context || !timeRange || !timeField || !index) {
    return null;
  }

  dataService.setConfig(dataSourceId, index, timeField, source);

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

  const specsVis = !fetchDataLoading && !distributionLoading && (
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
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{dataDistributionTitle}</EuiFlexItem>
        {dataDistributionSpecs.length > 0 && (
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
          {specsVis}
          {distributionModal}
        </>
      )}
    </EuiPanel>
  );
};
