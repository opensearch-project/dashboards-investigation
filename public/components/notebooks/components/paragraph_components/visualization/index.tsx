/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { EuiLoadingContent, EuiSpacer, EuiText } from '@elastic/eui';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import moment from 'moment';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import { VisualizationInputValue } from '../../input/visualization_input';
import { DashboardContainerInput } from '../../../../../../../../src/plugins/dashboard/public';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { MultiVariantInput } from '../../input/multi_variant_input';
import {
  createDashboardVizObject,
  getPanelValue,
} from '../../../../../../public/utils/visualization';
import { useVisualizationValue } from './use_visualization_value';

export const VisualizationParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const {
    services: {
      uiSettings,
      dashboard: { DashboardContainerByValueRenderer },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const inputJSON: DashboardContainerInput = useMemo(
    () => JSON.parse(paragraphValue.input.inputText),
    [paragraphValue.input.inputText]
  );
  const { runParagraph } = useParagraphs();

  const visualizationValue: VisualizationInputValue | undefined = useVisualizationValue(inputJSON);

  const isRunning = paragraphValue.uiState?.isRunning;
  const dateFormat = uiSettings.get('dateFormat');

  const panels = useMemo(() => {
    if (!visualizationValue || !visualizationValue.id || !inputJSON) {
      return undefined;
    }

    let from = moment(visualizationValue?.startTime).format(dateFormat);
    let to = moment(visualizationValue?.endTime).format(dateFormat);
    from = from === 'Invalid date' ? visualizationValue?.startTime || '' : from;
    to = to === 'Invalid date' ? visualizationValue?.endTime || '' : to;

    return Object.entries(inputJSON.panels || {}).reduce(
      (acc, [panelKey, panel]) => ({
        ...acc,
        [panelKey]: getPanelValue(panel as DashboardContainerInput['panels'][number], {
          ...visualizationValue,
          startTime: from,
          endTime: to,
        }),
      }),
      {} as DashboardContainerInput['panels']
    );
  }, [visualizationValue, dateFormat, inputJSON]);

  const handleSubmitParagraph = useCallback(
    ({ inputType, parameters }) => {
      paragraphState.updateInput({
        inputText: JSON.stringify(createDashboardVizObject(parameters)),
        inputType,
        parameters,
      });
      runParagraph({
        id: paragraphValue.id,
      });
    },
    [paragraphState, paragraphValue.id, runParagraph]
  );

  return (
    <>
      <MultiVariantInput
        input={{
          inputText: '',
          inputType: 'VISUALIZATION',
          parameters: visualizationValue,
        }}
        onSubmit={handleSubmitParagraph}
      />
      <EuiSpacer size="m" />
      {visualizationValue?.id ? (
        isRunning ? (
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
        ) : null
      ) : null}
    </>
  );
};
