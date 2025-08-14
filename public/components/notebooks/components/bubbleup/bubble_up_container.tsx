/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';
import { useObservable } from 'react-use';
import { Observable } from 'rxjs';
import { AnomalyVisualizationAnalysisOutputResult } from 'common/types/notebooks';
import { NoteBookServices } from 'public/types';
import { BubbleUpInput } from './embeddable/types';
import { EmbeddableRenderer } from '../../../../../../../src/plugins/embeddable/public';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_bubble_vega';
import { BubbleUpDataService } from './bubble_up_data_service';
import { useParagraphs } from '../../../../hooks/use_paragraphs';
import { ParagraphState, ParagraphStateValue } from '../../../../../common/state/paragraph_state';
import './bubble_up_viz.scss';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

const ITEMS_PER_PAGE = 3;

export const BubbleUpContainer = ({
  paragraph$,
}: {
  paragraph$: Observable<ParagraphStateValue<AnomalyVisualizationAnalysisOutputResult>>;
}) => {
  const {
    services: { embeddable },
  } = useOpenSearchDashboards<NoteBookServices>();
  const context = useContext(NotebookReactContext);
  const topContextValue = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );
  const paragraph = useObservable(paragraph$);
  const { result } = ParagraphState.getOutput(paragraph)! || {};
  const { fieldComparison } = result! || {};
  const { timeRange, timeField, index, dataSourceId, PPLFilters, filters } = topContextValue;
  const { saveParagraph } = useParagraphs();
  const [activePage, setActivePage] = useState(0);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const factory = embeddable.getEmbeddableFactory<BubbleUpInput>('vega_visualization');
  const bubbleUpSpecs = useMemo(() => {
    if (fieldComparison) {
      return generateAllFieldCharts(fieldComparison);
    }

    return [];
  }, [fieldComparison]);

  const dataService = useMemo(() => new BubbleUpDataService(), []);

  const loadSpecsData = useCallback(async () => {
    try {
      const response = await dataService.fetchComparisonData({ selectionFilters: filters });
      setSpecsLoading(false);
      const discoverFields = await dataService.discoverFields(response);
      const difference = await dataService.analyzeDifferences(response, discoverFields);
      const formatComparison = dataService.formatComparisonSummary(difference);
      setDistributionLoading(false);
      return formatComparison;
    } catch (error) {
      console.error('Error fetching or processing data:', error);
    } finally {
      setSpecsLoading(false);
    }
  }, [dataService, filters]);

  useEffect(() => {
    (async () => {
      if (
        fieldComparison ||
        specsLoading ||
        distributionLoading ||
        !paragraph ||
        paragraph.uiState?.isRunning
      ) {
        return;
      }

      setSpecsLoading(true);
      setDistributionLoading(true);

      const formatComparison = await loadSpecsData();

      if (paragraph) {
        await saveParagraph({
          paragraphStateValue: ParagraphState.updateOutputResult(paragraph, {
            fieldComparison: formatComparison || [],
          }),
        });
      }
    })();
  }, [loadSpecsData, fieldComparison, specsLoading, distributionLoading, paragraph, saveParagraph]);

  const { paginatedSpecs, totalPages } = useMemo(() => {
    if (!bubbleUpSpecs?.length) {
      return { paginatedSpecs: [], totalPages: 0 };
    }

    const start = activePage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      paginatedSpecs: bubbleUpSpecs.slice(start, end),
      totalPages: Math.ceil(bubbleUpSpecs.length / ITEMS_PER_PAGE),
    };
  }, [bubbleUpSpecs, activePage]);

  if (!context || !timeRange || !timeField || !index) {
    return null;
  }

  dataService.setConfig(
    dataSourceId,
    index,
    timeRange.selectionFrom,
    timeRange.selectionTo,
    timeRange.baselineFrom,
    timeRange.baselineTo,
    timeField,
    PPLFilters
  );

  const horizontalSteps: Array<Omit<EuiStepHorizontalProps, 'step'>> = [
    {
      title: 'Fetch data from index',
      status: specsLoading ? 'loading' : 'complete',
      onClick: () => {},
    },
    {
      title: 'Analyze data distribution',
      status: specsLoading ? undefined : distributionLoading ? 'loading' : 'complete',
      onClick: () => {},
    },
  ];

  const specsVis = !specsLoading && (
    <EuiAccordion
      id="accordion1"
      buttonContent="Show the key field visualizations"
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        {paginatedSpecs.map((spec, specIndex) => {
          const uniqueKey = `${activePage * ITEMS_PER_PAGE + specIndex}`;
          const uniqueId = `text2viz-${activePage * ITEMS_PER_PAGE + specIndex}`;

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
    </EuiAccordion>
  );

  return (
    <>
      <EuiStepsHorizontal steps={horizontalSteps} style={{ background: 'transparent' }} />
      <EuiSpacer size="m" />
      {specsVis}
    </>
  );
};
