/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import moment from 'moment';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import {
  VisualizationInput,
  VisualizationInputValue,
} from '../../paragraph_inputs/visualization_input';
import { DashboardContainerInput } from '../../../../../../../../src/plugins/dashboard/public';
import { ViewMode } from '../../../../../../../../src/plugins/embeddable/public';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { OBSERVABILITY_VISUALIZATION_TYPE } from '../../../../../../common/constants/notebooks';

export const getPanelValue = (
  panelValue: DashboardContainerInput['panels'][number],
  value: VisualizationInputValue
) => ({
  ...panelValue,
  type: value.type,
  explicitInput: {
    ...panelValue.explicitInput,
    savedObjectId: value.id,
  },
});

export const createDashboardVizObject = (value: VisualizationInputValue) => {
  const { startTime, endTime } = value;
  const vizUniqueId = htmlIdGenerator()();
  // a dashboard container object for new visualization
  const newVizObject: DashboardContainerInput = {
    viewMode: ViewMode.VIEW,
    panels: {
      '1': getPanelValue(
        {
          gridData: {
            x: 0,
            y: 0,
            w: 50,
            h: 20,
            i: '1',
          },
          type: '',
          explicitInput: {
            id: '1',
          },
        },
        value
      ),
    },
    isFullScreenMode: false,
    filters: [],
    useMargins: false,
    id: vizUniqueId,
    timeRange: {
      from: startTime,
      to: endTime,
    },
    title: 'embed_viz_' + vizUniqueId,
    query: {
      query: '',
      language: 'lucene',
    },
    refreshConfig: {
      pause: true,
      value: 15,
    },
  };
  return newVizObject;
};

export const VisualizationParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const endDate = useMemo(() => new Date(), []);
  const {
    services: {
      uiSettings,
      dashboard: { DashboardContainerByValueRenderer },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const inputJSON = useMemo(() => {
    let result: DashboardContainerInput = createDashboardVizObject({
      type: '',
      id: '',
      startTime: '',
      endTime: '',
    });

    try {
      result = JSON.parse(paragraphValue.input.inputText);
    } catch (e) {
      // do nothing
    }

    return result;
  }, [paragraphValue.input.inputText]);
  const visualizationValue: VisualizationInputValue | undefined = useMemo(() => {
    const visualizationPanel = inputJSON.panels[1];
    let selectedVisualizationId: string = visualizationPanel.explicitInput.savedObjectId as string;
    const startDate = new Date(endDate.toISOString());
    startDate.setDate(endDate.getDate() - 30);
    const startTime = inputJSON.timeRange.from || startDate.toISOString();
    const endTime = inputJSON.timeRange.to || endDate.toISOString();
    if (!selectedVisualizationId) {
      return undefined;
    }

    const observabilityVisStartWord = `${OBSERVABILITY_VISUALIZATION_TYPE}:`;
    const ifIdIncludesType = selectedVisualizationId.startsWith(observabilityVisStartWord);

    const selectedVisualizationType = ifIdIncludesType
      ? OBSERVABILITY_VISUALIZATION_TYPE
      : visualizationPanel.type;
    selectedVisualizationId = ifIdIncludesType
      ? selectedVisualizationId.replace(observabilityVisStartWord, '')
      : selectedVisualizationId;
    return {
      type: selectedVisualizationType,
      id: selectedVisualizationId,
      startTime,
      endTime,
    };
  }, [inputJSON, endDate]);
  const { runParagraph } = useParagraphs();

  const runParagraphHandler = async () => {
    paragraphState.updateUIState({
      isRunning: true,
    });
    try {
      await runParagraph({
        id: paragraphValue.id,
      });
    } catch (e) {
      // do nothing
    } finally {
      paragraphState.updateUIState({
        isRunning: false,
      });
    }
  };

  const isRunning = paragraphValue.uiState?.isRunning;
  const dateFormat = uiSettings.get('dateFormat');

  const panels = useMemo(() => {
    if (!visualizationValue || !inputJSON) {
      return undefined;
    }

    let from = moment(visualizationValue?.startTime).format(dateFormat);
    let to = moment(visualizationValue?.endTime).format(dateFormat);
    from = from === 'Invalid date' ? visualizationValue?.startTime || '' : from;
    to = to === 'Invalid date' ? visualizationValue?.endTime || '' : to;

    return Object.entries(inputJSON.panels || {}).reduce(
      (acc, [panelKey, panel]: [string, DashboardContainerInput['panels'][number]]) => ({
        ...acc,
        [panelKey]: getPanelValue(panel, {
          ...visualizationValue,
          startTime: from,
          endTime: to,
        }),
      }),
      {} as DashboardContainerInput['panels']
    );
  }, [visualizationValue, dateFormat, inputJSON]);

  return (
    <>
      <EuiSpacer size="s" />
      <VisualizationInput
        value={visualizationValue}
        onChange={(value) => {
          paragraphState.updateInput({
            inputText: JSON.stringify(
              createDashboardVizObject({
                ...visualizationValue,
                id: value.id || '',
                type: visualizationValue?.type || '',
                startTime: value.startTime || visualizationValue?.startTime || '',
                endTime: value.endTime || visualizationValue?.endTime || '',
              })
            ),
          });
        }}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            data-test-subj={`runRefreshBtn-${paragraphValue.id}`}
            onClick={() => {
              runParagraphHandler();
            }}
          >
            {ParagraphState.getOutput(paragraphValue)?.result !== '' ? 'Refresh' : 'Run'}
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isRunning ? (
        <EuiLoadingContent />
      ) : panels ? (
        <>
          <EuiText size="s" style={{ marginLeft: 9 }}>
            {`${visualizationValue?.startTime} - ${visualizationValue?.endTime}`}
          </EuiText>
          <DashboardContainerByValueRenderer
            input={{
              ...inputJSON,
              panels,
            }}
          />
        </>
      ) : null}
    </>
  );
};
