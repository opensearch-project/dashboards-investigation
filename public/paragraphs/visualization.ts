/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { VisualizationParagraph } from '../components/notebooks/components/paragraph_components/visualization';
import { ParagraphRegistryItem } from '../services/paragraph_service';
import { getClient } from '../services';
import { EXPLORE_VISUALIZATION_TYPE, NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';

/**
 * Waits for a DOM element to appear with a configurable timeout
 * @param selector - CSS selector for the element to detect
 * @param timeout - Maximum time to wait in milliseconds (default: 10000ms)
 * @param checkInterval - Interval between checks in milliseconds (default: 100ms)
 * @returns Promise that resolves with the element when found, or rejects on timeout
 */
export const waitForDomElement = (
  selector: string,
  timeout: number = 10000,
  checkInterval: number = 1000
): Promise<Element> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Check if element already exists
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    // Set up interval to check for element
    const intervalId = setInterval(() => {
      const element = document.querySelector(selector);

      if (element) {
        clearInterval(intervalId);
        resolve(element);
      } else if (Date.now() - startTime >= timeout) {
        clearInterval(intervalId);
        reject(new Error(`Timeout waiting for element: ${selector} (${timeout}ms)`));
      }
    }, checkInterval);
  });
};

export const VisualizationParagraphItem: ParagraphRegistryItem = {
  ParagraphComponent: VisualizationParagraph,
  runParagraph: async () => {
    return;
  },
  async getContext(paragraphStateValue) {
    const { id, dataSourceMDSId, input } = paragraphStateValue;
    const httpClient = getClient();

    if (input.parameters.type !== EXPLORE_VISUALIZATION_TYPE) {
      return '';
    }

    try {
      // Find the visualization paragraph DOM element using data-paragraph-id attribute
      const paragraphElement = document.querySelector(`[data-paragraph-id="${id}"]`);

      if (!paragraphElement) {
        console.error(`Visualization paragraph element not found for ID: ${id}`);
        return '';
      }

      // We can not get the embeddable from a dashboard renderer
      // so we have to poll for visualization to be completely rendered.
      // TODO: add onMount: (embeddable) => {} callback to DashboardsRenderer component
      await waitForDomElement(
        `[data-paragraph-id="${id}"] [data-test-subj="osdExploreContainer"] canvas, [data-paragraph-id="${id}"] [data-test-subj="osdExploreContainer"] table`,
        10000,
        1000
      );

      // Find the dashboard viewport within the paragraph
      // This is where the actual visualization is rendered
      const visualizationContainer = paragraphElement.querySelector('.dshDashboardViewport');

      if (!visualizationContainer) {
        console.error('Visualization container (.dshDashboardViewport) not found within paragraph');
        return '';
      }

      // Use html2canvas to capture the visualization as an image
      const canvas = await html2canvas(visualizationContainer as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 1, // Lower scale for smaller file size
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert canvas to base64 JPEG with low quality (0.5) to save tokens
      const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

      // Send the base64 image to the visualization summary API
      const response = await httpClient.post({
        path: `${NOTEBOOKS_API_PREFIX}/visualization/summary`,
        body: JSON.stringify({
          visualization: base64Image,
        }),
        query: dataSourceMDSId ? { dataSourceId: dataSourceMDSId } : undefined,
      });

      // Extract and return the summary from the response
      if (!response || !response.summary) {
        console.error('No summary returned from visualization summary API');
        return '';
      }

      return `
## Step description
This step displays a visualization that provides visual insights into the data.

## Visualization Analysis
${response.summary}`;
    } catch (error) {
      console.error('Error generating visualization context:', error);
      return '';
    }
  },
};
