/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useState } from 'react';
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

export const VisualizationParagraph = ({
  paragraphState,
  actionDisabled,
}: {
  paragraphState: ParagraphState;
  actionDisabled: boolean;
}) => {
  const {
    services: {
      uiSettings,
      dashboard: { DashboardContainerByValueRenderer },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const inputJSON = useMemo(
    () => createDashboardVizObject(paragraphValue.input.parameters as VisualizationInputValue),
    [paragraphValue.input.parameters]
  );
  const { runParagraph } = useParagraphs();
  const [visualizationValue, setVisualizationValue] = useState<VisualizationInputValue>(
    paragraphValue.input.parameters as VisualizationInputValue
  );

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

  const handleSubmitParagraph = useCallback(
    ({ inputType, parameters }) => {
      setVisualizationValue(parameters as VisualizationInputValue);
      paragraphState.updateInput({
        inputText: '',
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
        input={{ inputText: JSON.stringify(inputJSON), inputType: 'VISUALIZATION' }}
        onSubmit={handleSubmitParagraph}
      />
      <EuiSpacer size="m" />
      {visualizationValue.id ? (
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
