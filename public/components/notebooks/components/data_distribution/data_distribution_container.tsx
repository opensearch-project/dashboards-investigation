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
import { DataDistributionInput } from './embeddable/types';
import { EmbeddableRenderer } from '../../../../../../../src/plugins/embeddable/public';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_data_distribution_vega';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { DATA_DISTRIBUTION_PARAGRAPH_TYPE } from '../../../../../common/constants/notebooks';
import './data_distribution_viz.scss';

const ITEMS_PER_PAGE = 3;

export const DataDistributionContainer = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<AnomalyVisualizationAnalysisOutputResult>;
}) => {
  const {
    services: { embeddable, paragraphService },
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
  const factory = embeddable.getEmbeddableFactory<DataDistributionInput>('vega_visualization');
  const paragraphRegistry = paragraphService?.getParagraphRegistry(
    DATA_DISTRIBUTION_PARAGRAPH_TYPE
  );
  const { fetchDataLoading, distributionLoading, error } =
    paragraph?.uiState?.dataDistribution || {};

  const dataDistributionSpecs = useMemo(() => {
    if (fieldComparison) {
      return generateAllFieldCharts(fieldComparison, source);
    }
    return [];
  }, [fieldComparison, source]);

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

      await paragraphRegistry?.runParagraph({
        paragraphState,
        saveParagraph,
        notebookStateValue: context.state.value,
      });
    })();
  }, [
    paragraphRegistry,
    fieldComparison,
    fetchDataLoading,
    distributionLoading,
    paragraph,
    error,
    paragraphState,
    saveParagraph,
    context.state.value,
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

  const excludeButton = (chartIndex: number, isSelected: boolean) => {
    return (
      <div style={{ paddingLeft: '10px' }}>
        <EuiToolTip content={isSelected ? 'Exclude from the results' : 'Select from the results'}>
          <EuiSmallButtonIcon
            iconType={isSelected ? 'crossInCircleEmpty' : 'checkInCircleEmpty'}
            color="text"
            style={{ height: '16px', width: '16px' }}
            onClick={async () => {
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
            }}
            aria-label={isSelected ? 'Exclude from the results' : 'Select from the results'}
          />
        </EuiToolTip>
      </div>
    );
  };

  interface MemoItemProps {
    uniqueKey: string;
    uniqueId: string;
    chartIndex: number;
    isSelected: boolean;
    spec: any;
  }

  const BASE_FLEX_ITEM_STYLE = { minHeight: 300, minWidth: 300 };
  const MemoItem: React.FC<MemoItemProps> = React.memo(
    ({ uniqueKey, uniqueId, chartIndex, isSelected, spec }: MemoItemProps) => {
      const itemStyle = useMemo(
        () => ({
          ...BASE_FLEX_ITEM_STYLE,
          maxWidth: `${100 / ITEMS_PER_PAGE}%`,
          opacity: isSelected ? 0.5 : 1,
        }),
        [isSelected]
      );
      return (
        <EuiFlexItem grow={true} key={uniqueKey} style={itemStyle}>
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
          {excludeButton(chartIndex, isSelected)}
        </EuiFlexItem>
      );
    }
  ) as React.FC<MemoItemProps>;

  const specsVis = !fetchDataLoading && !distributionLoading && (
    <EuiPanel hasShadow={false} borderRadius="l">
      {paginatedSpecs.length ? (
        <>
          <EuiFlexGroup wrap responsive={false}>
            {paginatedSpecs.map((spec, specIndex) => {
              const uniqueKey = `${activePage * ITEMS_PER_PAGE + specIndex}`;
              const uniqueId = `dis-id-${activePage * ITEMS_PER_PAGE + specIndex}`;
              const chartIndex = activePage * ITEMS_PER_PAGE + specIndex;
              const isSelected = !!fieldComparison[chartIndex].excludeFromContext;

              return (
                <MemoItem
                  uniqueKey={uniqueKey}
                  uniqueId={uniqueId}
                  chartIndex={chartIndex}
                  isSelected={isSelected}
                  spec={spec}
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
          {dataDistributionSpecs.map((spec, specIndex) => {
            const uniqueKey = `dis-modal-key-${specIndex}`;
            const uniqueId = `dis-modal-id-${specIndex}`;
            const isSelected = !!fieldComparison[specIndex].excludeFromContext;

            return (
              <EuiFlexItem key={uniqueKey} style={{ opacity: isSelected ? 0.5 : 1, height: 300 }}>
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
                {excludeButton(specIndex, isSelected)}
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
