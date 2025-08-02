/* eslint-disable */
//TODO: Add this for checking code quickly, wait component creator to remove this and fix error.
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPagination,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  getDefaultOuiMarkdownProcessingPlugins,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';
import { getEmbeddable } from '../../../../services';
import { BubbleUpInput } from './embeddable/types';
import { EmbeddableRenderer } from '../../../../../../../src/plugins/embeddable/public';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_bubble_vega';
import { BubbleUpModel } from './container_model';
import { BubbleUpDataService } from './bubble_up_data_service';
import { useObservable } from 'react-use';
import { useParagraphs } from '../../../../hooks/use_paragraphs';
import { Observable } from 'rxjs';
import { ParagraphState, ParagraphStateValue } from '../../../../../common/state/paragraph_state';
import { AnomalyVisualizationAnalysisOutputResult } from 'common/types/notebooks';
import './bubble_up_viz.scss';

const ITEMS_PER_PAGE = 3;

export const BubbleUpContainer = ({ paragraph$ }: { paragraph$: Observable<ParagraphStateValue<AnomalyVisualizationAnalysisOutputResult>> }) => {
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
  const bubbleUpSpecs = useMemo(() => {
    if (fieldComparison) {
      return generateAllFieldCharts(fieldComparison);
    }

    return [];
  }, [fieldComparison]);
  const [summary] = useState<string>();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  const markdownRef = useRef<HTMLDivElement>(null);

  const factory = getEmbeddable().getEmbeddableFactory<BubbleUpInput>('vega_visualization');
  const dataService = useMemo(() => new BubbleUpDataService(), []);

  // Process Markdown text and convert field references into special links
  const processMarkdown = useCallback((text: string) => {
    if (!text) {
      return '';
    }
    return text.replace(/\[FIELD:(.*?)\]/g, (match, fieldName) => {
      return `[${fieldName}](http://field?${fieldName})`;
    });
  }, []);

  const handleFieldLinkClick = useCallback((fieldName: string) => {
    setSelectedField(fieldName);
    setActivePage(0);
    setShowModel(true);
  }, []);

  // 2. Create an event handling function
  const handleLinkClick = useCallback(
    (event: MouseEvent) => {
      let target = event.target as HTMLElement;

      // Search up for the nearest A tag
      while (target && target.tagName !== 'A') {
        if (!markdownRef.current?.contains(target)) return;
        target = target.parentElement;
      }

      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');

        if (href && href.startsWith('http://field?')) {
          event.preventDefault();
          event.stopPropagation();

          const fieldName = href.substring(13);
          handleFieldLinkClick(fieldName);
        }
      }
    },
    [handleFieldLinkClick]
  );

  // 3. Attach event listener
  const attachEventListeners = useCallback(() => {
    const markdownElement = markdownRef.current;
    if (!markdownElement) {
      return false;
    }

    markdownElement.removeEventListener('click', handleLinkClick, true);
    markdownElement.addEventListener('click', handleLinkClick, true);
    return true;
  }, [handleLinkClick]);

  getDefaultOuiMarkdownProcessingPlugins();

  // 4. Set up a polling mechanism to ensure event binding
  useEffect(() => {
    if (!summary) return;
    const markdownElement = markdownRef.current;

    let foundLinks = attachEventListeners();

    const intervalId = setInterval(() => {
      foundLinks = attachEventListeners();
      if (foundLinks) {
        clearInterval(intervalId);
      }
    }, 100);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);

      if (markdownElement) {
        markdownElement.removeEventListener('click', handleLinkClick, true);
      }
    };
  }, [summary, attachEventListeners, handleLinkClick]);

  useEffect(() => {
    const loadSpecsData = async () => {
      if (specsLoading || distributionLoading) {
        return;
      }
      setSpecsLoading(true);
      setDistributionLoading(true);

      if (fieldComparison && fieldComparison.length > 0) {
        setSpecsLoading(false);
        setDistributionLoading(false);
        return;
      }

      if (!timeRange || !timeField || !index) {
        console.error('Missing required context for data fetch');
        return;
      }

      try {
        dataService.setConfig(
          dataSourceId,
          index,
          timeRange.from,
          timeRange.to,
          timeField,
          PPLFilters
        );
        const response = await dataService.fetchComparisonData({ selectionFilters: filters });
        setSpecsLoading(false);
        const discoverFields = await dataService.discoverFields(response);
        const difference = await dataService.analyzeDifferences(response, discoverFields);
        const fieldComparison = dataService.formatComparisonSummary(difference);
        if (paragraph) {
          await saveParagraph({
            paragraphStateValue: ParagraphState.updateOutputResult(paragraph, {
              fieldComparison
            })  
          });
        }
        setDistributionLoading(false);
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setSpecsLoading(false);
      }
    };

    loadSpecsData();
  }, [dataService, fieldComparison, specsLoading]);

  const { paginatedSpecs, totalPages } = useMemo(() => {
    if (!bubbleUpSpecs?.length) return { paginatedSpecs: [], totalPages: 0 };

    const specs = bubbleUpSpecs;

    const start = activePage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      paginatedSpecs: specs.slice(start, end),
      totalPages: Math.ceil(specs.length / ITEMS_PER_PAGE),
    };
  }, [bubbleUpSpecs, activePage]);

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

  const summaryContent = summary ? (
    <EuiAccordion id="accordion2" buttonContent="Show the anomaly summary" initialIsOpen={true}>
      <>
        <EuiSpacer size="m" />
        <div>
          <div ref={markdownRef}>
            <EuiMarkdownFormat>{processMarkdown(summary)}</EuiMarkdownFormat>
          </div>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            title={
              <EuiText size="s">
                <strong>Interactive Analysis:</strong> Click on the highlighted field names in the
                analysis above to show visualization.
              </EuiText>
            }
            iconType="help"
          />
        </div>
      </>
    </EuiAccordion>
  ) : (
    <></>
  );

  const specsVis = !specsLoading && (
    <EuiAccordion
      id="accordion1"
      buttonContent="Show the key field visualizations"
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        {paginatedSpecs.map((spec, index) => {
          const uniqueKey = `${activePage * ITEMS_PER_PAGE + index}`;
          const uniqueId = `text2viz-${activePage * ITEMS_PER_PAGE + index}`;

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

  if (!context) {
    return null;
  }

  return (
    <>
      <EuiStepsHorizontal steps={horizontalSteps} style={{ background: 'transparent' }} />
      <EuiSpacer size="m" />
      {summaryContent}
      <EuiSpacer size="m" />
      {specsVis}
      {showModel && (
        <BubbleUpModel
          title={`Anomaly Visualization -${selectedField}`}
          closeModal={() => {
            setShowModel(false);
          }}
          bubbleUpSpec={bubbleUpSpecs.filter((spec) => spec?.title?.text === selectedField)[0]}
        />
      )}
    </>
  );
};
