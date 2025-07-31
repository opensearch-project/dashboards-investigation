/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphStateValue } from 'public/state/paragraph_state';
import { ParaType } from '../../../../../common/types/notebooks';

// Get the type of output and result in a default notebook paragraph
// Param: Default Backend Paragraph
const parseOutput = (paraObject: ParagraphStateValue) => {
  try {
    const outputType: string[] = [];
    const result: Array<Required<ParagraphStateValue>['output'][0]['result']> = [];
    paraObject.output?.map((output) => {
      outputType.push(output.outputType);
      result.push(output.result);
    });
    return {
      outputType,
      outputData: result,
    };
  } catch (error) {
    return {
      outputType: [],
      outputData: [],
    };
  }
};

// Get the coding language by type of paragraph
// Param: Default Backend Paragraph
const parseInputType = (paraObject: any) => {
  try {
    if (paraObject.input.inputType === 'MARKDOWN') {
      return 'md';
    } else {
      return '';
    }
  } catch (error) {
    throw new Error('Parsing Input Issue ' + error);
  }
};

// Get the visualization by type of paragraph
// Param: Default Backend Paragraph
const parseVisualization = (paraObject: any) => {
  try {
    if (paraObject.input.inputType.includes('VISUALIZATION')) {
      const vizContent = paraObject.input.inputText;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      let visStartTime = startDate.toISOString();
      let visEndTime = new Date().toISOString();
      let visSavedObjId = '';
      if (vizContent !== '') {
        const { panels, timeRange } = JSON.parse(vizContent);
        visStartTime = timeRange.from;
        visEndTime = timeRange.to;
        visSavedObjId = panels['1'].explicitInput.savedObjectId;
      }
      return {
        isViz: true,
        VizObject: vizContent,
        visStartTime,
        visEndTime,
        visSavedObjId,
      };
    } else {
      return {
        isViz: false,
        VizObject: '',
      };
    }
  } catch (error) {
    throw new Error('Parsing Input Issue ' + error);
  }
};

// Placeholder for default parser
// Param: Default Backend Paragraph
export const defaultParagraphParser = (defaultBackendParagraphs: ParagraphStateValue[]) => {
  const parsedPara: ParaType[] = [];
  try {
    defaultBackendParagraphs.map((paraObject, index: number) => {
      const codeLanguage = parseInputType(paraObject);
      const vizParams = parseVisualization(paraObject);
      const message = parseOutput(paraObject);

      const tempPara: ParaType = {
        uniqueId: paraObject.id,
        isRunning: paraObject.uiState?.isRunning || false,
        inQueue: paraObject.uiState?.inQueue || false,
        showAddPara: false,
        isVizualisation: vizParams.isViz,
        isDeepResearch: paraObject.input.inputType.includes('DEEP_RESEARCH'),
        isAnomalyVisualizationAnalysis: paraObject.input.inputType.includes(
          'ANOMALY_VISUALIZATION_ANALYSIS'
        ),
        vizObjectInput: vizParams.VizObject,
        id: index + 1,
        inp: paraObject.input.inputText || '',
        lang: 'text/x-' + codeLanguage,
        editorLanguage: codeLanguage,
        typeOut: message.outputType,
        out: message.outputData,
        isOutputStale: false,
        paraDivRef: undefined,
        visStartTime: vizParams.visStartTime,
        visEndTime: vizParams.visEndTime,
        visSavedObjId: vizParams.visSavedObjId,
        dataSourceMDSId: paraObject.dataSourceMDSId,
      };
      parsedPara.push(tempPara);
    });
    return parsedPara;
  } catch (error) {
    throw new Error('Parsing Paragraph Issue ' + error);
  }
};
