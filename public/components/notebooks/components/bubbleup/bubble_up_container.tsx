/* eslint-disable */
//TODO: Add this for checking code quickly, wait component creator to remove this and fix error.
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react';
import {
  EuiAccordion,
  EuiFlexGrid,
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
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';
import { getEmbeddable } from '../../../../services';
import { CoreStart } from '../../../../../../../src/core/public';
import { ParaType } from '../../../../../common/types/notebooks';
import { BubbleUpInput } from './embeddable/types';
import { EmbeddableRenderer } from '../../../../../../../src/plugins/embeddable/public';
import './bubble_up_viz.scss';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { generateAllFieldCharts } from './render_bubble_vega';
import { callOpenSearchCluster } from '../../../../plugin_helpers/plugin_proxy_call';
import { BubbleUpModel } from './container_model';
import { BubbleUpDataService } from './bubble_up_data_service';

interface Props {
  index: number;
  http: CoreStart['http'];
  para: ParaType;
  updateBubbleParagraph: (index: number, paraUniqueId: string, result: string) => Promise<any>;
  updateNotebookContext: (newContext: any) => Promise<any>;
}

const ITEMS_PER_PAGE = 4;

export const BubbleUpContainer = ({
  index,
  para,
  http,
  updateBubbleParagraph,
  updateNotebookContext,
}: Props) => {
  const context = useContext(NotebookReactContext);
  if (!context) {
    return null;
  }
  const [activePage, setActivePage] = useState(0);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [bubbleUpSpecs, setBubbleUpSpecs] = useState<Array<Record<string, unknown>>>([]);
  const [disSummary, setDisSummary] = useState<Array<Record<string, unknown>>>([]);
  const [summary, setSummary] = useState<string>();
  const [summaryLoading, setSummaryLoading] = useState(false);
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

      const markdownElement = markdownRef.current;
      if (markdownElement) {
        markdownElement.removeEventListener('click', handleLinkClick, true);
      }
    };
  }, [summary, attachEventListeners]);

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

      if (!context.timeRange || !context.timeField || !context.dataSourceId || !context.index) {
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
  }, []);

  useEffect(() => {
    if (!bubbleUpSpecs || bubbleUpSpecs.length === 0) {
      return;
    }

    const loadSummary = async () => {
      setSummaryLoading(true);
      if (!!para.out?.[0]) {
        try {
          const savedOutput = JSON.parse(para.out[0]);
          if (savedOutput.summary) {
            setSummary(savedOutput.summary);
            setSummaryLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing saved output:', e);
        }
      }

      try {
        setSummary('');
        console.log('bubbleUpSpecs', bubbleUpSpecs);
        const result = await callOpenSearchCluster({
          http,
          request: {
            path: '/_plugins/_ml/models/aKoOY5cB6yOFQkrFEbF9/_predict',
            method: 'POST',
            body: JSON.stringify({
              parameters: {
                system_prompt: 'No system prompt',
                prompt: `
        I need you to conduct a comprehensive analysis of system performance data to identify and explain anomalies. Please analyze both the problematic distribution (selectionDist) and the normal baseline (baselineDist) to produce actionable insights.
        
        Structure your analysis as follows:
        
        ## Investigation Results: [Concise Problem Title]
        
        ### Key Findings:
        - Primary Issue: [Main component with metrics]
          * [List specific endpoints/services with their performance metrics]
          * [Include P95/P99 values and compare to normal baselines]
          * [Note maximum observed deviations]
          * [Concrete data points supporting your conclusion]
          * [Include specific metrics/deviations]
        - Pattern Observed: [Temporal patterns, frequency]
        - Impact: [2-3 lines Affected services/users]

        ### Anomaly Summary:
        Anomaly Analysis Identified: [One-line summary of the primary issue]
        
        [Brief executive summary paragraph with the most important insight framed in business terms]
        
        IMPORTANT: When mentioning Available field names (${disSummary
          .slice(0, 15)
          .map(
            (spec) => spec.field
          )}) in your analysis, wrap them with [FIELD:fieldname] tags. Use the exact field names from the data below. Bold the content that you feel confident about.
        
        The selectionDist and baselineDist are as follow:
          ${JSON.stringify(disSummary.slice(0, 15))}
                      `,
              },
            }),
          },
          dataSourceId: context.dataSourceId,
        });
        const summaryFromLLM =
          result.inference_results[0].output[0].dataAsMap.output.message.content[0].text;
        setSummary(summaryFromLLM);
        setSummaryLoading(false);

        await updateBubbleParagraph(
          index,
          para.uniqueId,
          JSON.stringify({ summary: summaryFromLLM })
        );
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [bubbleUpSpecs]);

  const { paginatedSpecs, totalPages } = useMemo(() => {
    if (!bubbleUpSpecs?.length) return { paginatedSpecs: [], totalPages: 0 };

    const specs = bubbleUpSpecs;
    // if (selectedField) {
    //   specs = bubbleUpSpecs.filter(spec => {
    //     const specField: string = spec.title?.text || '';
    //     return specField === selectedField;
    //   });
    // }

    const start = activePage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      paginatedSpecs: specs.slice(start, end),
      totalPages: Math.ceil(specs.length / ITEMS_PER_PAGE),
    };
  }, [bubbleUpSpecs, activePage, selectedField]);

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
    {
      title: 'Anomaly summary from LLM',
      status: distributionLoading ? undefined : summaryLoading ? 'loading' : 'complete',
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

  const specsVis = !specsLoading && summary && (
    <EuiAccordion
      id="accordion1"
      buttonContent="Show the key field visualizations"
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={4}>
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
            <EuiFlexItem key={uniqueKey} style={{ height: 300, width: 300 }}>
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

  const steps: EuiContainedStepProps[] = [
    // {
    //   title: selectedField ? `Anomaly Visualization - ${selectedField}` : 'Anomaly Visualization',
    //   status: specsLoading ? 'loading' : 'complete',
    //   children: !specsLoading && (
    //     <EuiAccordion id="accordion1" buttonContent="Show the anomaly visualization" initialIsOpen={true}>
    //       <EuiSpacer size="m" />
    //       {selectedField && (
    //         <EuiCallOut
    //           size="s"
    //           title={<EuiText size="s">
    //             <strong>Filtered by:</strong> {selectedField}
    //             <EuiLink
    //               onClick={() => setSelectedField(null)}
    //             >
    //               (Clear filter)
    //             </EuiLink>
    //           </EuiText>}
    //           iconType="filter"
    //         />
    //       )}

    //       <EuiFlexGrid columns={4}>
    //         {paginatedSpecs.map((spec, index) => {
    //           const uniqueKey = selectedField
    //             ? `${selectedField}-${index}`
    //             : `${activePage * ITEMS_PER_PAGE + index}`;
    //           const uniqueId = selectedField
    //             ? `text2viz-${selectedField}-${index}`
    //             : `text2viz-${activePage * ITEMS_PER_PAGE + index}`;

    //           return (
    //             <EuiFlexItem key={uniqueKey} style={{ height: 300, width: 300 }}>
    //               {factory && spec && (
    //                 <EmbeddableRenderer
    //                   factory={factory}
    //                   input={{
    //                     id: uniqueId,
    //                     savedObjectId: '',
    //                     visInput: { spec }
    //                   }}
    //                 />
    //               )}
    //             </EuiFlexItem>
    //           );
    //         })}
    //       </EuiFlexGrid>
    //       <EuiSpacer size="m" />
    //       {totalPages > 1 && (
    //         <EuiFlexGroup justifyContent="center">
    //           <EuiFlexItem grow={false}>
    //             <EuiPagination
    //               pageCount={totalPages}
    //               activePage={activePage}
    //               onPageClick={setActivePage}
    //             />
    //           </EuiFlexItem>
    //         </EuiFlexGroup>
    //       )}
    //     </EuiAccordion>
    //   ),
    // },
    {
      title: 'Anomaly Summary',
      status: specsLoading ? undefined : summaryLoading ? 'loading' : 'complete',
      children:
        !summaryLoading && summary ? (
          <EuiAccordion
            id="accordion2"
            buttonContent="Show the anomaly summary"
            initialIsOpen={true}
          >
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
                    <strong>Interactive Analysis:</strong> Click on the highlighted field names in
                    the analysis above to show visualization.
                  </EuiText>
                }
                iconType="help"
              />
            </div>
          </EuiAccordion>
        ) : (
          <></>
        ),
    },
  ];

  return (
    <>
      <EuiStepsHorizontal steps={horizontalSteps} style={{ background: 'transparent' }} />
      {/* <EuiSteps steps={steps} /> */}
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
