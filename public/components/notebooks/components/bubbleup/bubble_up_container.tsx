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
import './bubble_up_viz.scss';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_bubble_vega';
import { BubbleUpModel } from './container_model';
import { bubbleUpDataService } from './bubble_up_data_service';

interface Props {
  updateNotebookContext: (newContext: any) => Promise<any>;
}

const ITEMS_PER_PAGE = 3;

export const BubbleUpContainer = ({ updateNotebookContext }: Props) => {
  const context = useContext(NotebookReactContext);
  const [activePage, setActivePage] = useState(0);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [bubbleUpSpecs, setBubbleUpSpecs] = useState<Array<Record<string, unknown>>>([]);
  const [, setDisSummary] = useState<Array<Record<string, unknown>>>([]);
  const [summary] = useState<string>();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  const markdownRef = useRef<HTMLDivElement>(null);

  const factory = getEmbeddable().getEmbeddableFactory<BubbleUpInput>('vega_visualization');
  const dataService = bubbleUpDataService;

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
      setSpecsLoading(true);
      setDistributionLoading(true);

      if (context?.specs && context.specs.length > 0) {
        const specs = generateAllFieldCharts(context.specs);
        setBubbleUpSpecs(specs);
        setSpecsLoading(false);
        setDistributionLoading(false);
        return context.specs;
      }

      if (!context.timeRange || !context.timeField || !context.index) {
        console.error('Missing required context for data fetch');
        return;
      }

      try {
        const { dataSourceId, index, timeRange, timeField, filters } = context;
        dataService.setConfig(
          dataSourceId,
          index,
          timeRange.from,
          timeRange.to,
          timeField,
          context.PPLFilters
        );
        const response = await dataService.fetchComparisonData({ selectionFilters: filters });
        setSpecsLoading(false);
        const discoverFields = await dataService.discoverFields(response);
        const difference = await dataService.analyzeDifferences(response, discoverFields);
        const summaryData = dataService.formatComparisonSummary(difference);
        setDisSummary(summaryData);
        const specs = generateAllFieldCharts(summaryData);

        setBubbleUpSpecs(specs);
        if (context.updateSpecs) {
          context.updateSpecs(summaryData);
        }
        await updateNotebookContext({ ...context, specs: summaryData });
        setDistributionLoading(false);
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setSpecsLoading(false);
      }
    };

    loadSpecsData();
  }, [context, dataService, updateNotebookContext]);

  useEffect(() => {
    if (!bubbleUpSpecs || bubbleUpSpecs.length === 0) {
      return;
    }
  }, [bubbleUpSpecs]);

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
          // const uniqueKey = selectedField
          //   ? `${selectedField}-${index}`
          //   : `${activePage * ITEMS_PER_PAGE + index}`;
          // const uniqueId = selectedField
          //   ? `text2viz-${selectedField}-${index}`
          //   : `text2viz-${activePage * ITEMS_PER_PAGE + index}`;

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
