/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiModalFooter,
  EuiButton,
  EuiSuperDatePicker,
} from '@elastic/eui';
import moment from 'moment';
import dateMath from '@elastic/datemath';

interface ReinvestigateModalProps {
  initialGoal: string;
  timeRange:
    | {
        selectionFrom: number;
        selectionTo: number;
      }
    | undefined;
  dateFormat: string;
  confirm: (params: {
    question: string;
    updatedTimeRange: {
      selectionFrom: number;
      selectionTo: number;
    };
    isReinvestigate: boolean;
  }) => void;
  closeModal: () => void;
}

export const ReinvestigateModal: React.FC<ReinvestigateModalProps> = ({
  initialGoal,
  timeRange,
  dateFormat,
  confirm,
  closeModal,
}) => {
  const [value, setValue] = useState(initialGoal);
  const [checked, setChecked] = useState(false);
  const [selectedTimeRange, setSelectedTimeRnage] = useState(timeRange);

  const { startFormatted, endFormatted } = useMemo(
    () => ({
      startFormatted: selectedTimeRange
        ? moment(selectedTimeRange.selectionFrom).format()
        : undefined,
      endFormatted: selectedTimeRange ? moment(selectedTimeRange.selectionTo).format() : undefined,
    }),
    [selectedTimeRange]
  );

  const handleTimeChange = useCallback((e) => {
    const fromMoment = dateMath.parse(e.start);
    const toMoment = dateMath.parse(e.end, { roundUp: true });

    setSelectedTimeRnage({
      selectionFrom: fromMoment?.valueOf() || 0,
      selectionTo: toMoment?.valueOf() || 0,
    });
  }, []);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>Reinvetigate the issue</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFormRow label="Edit inital goal">
            <EuiFieldText value={value} onChange={(e) => setValue(e.target.value)} required />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFormRow label="Edit time range">
            <EuiSuperDatePicker
              compressed
              start={startFormatted}
              end={endFormatted}
              showUpdateButton={false}
              dateFormat={dateFormat}
              onTimeChange={handleTimeChange}
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiSwitch
            label="Bring the exsiting hypothesis and findings"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton
            onClick={() =>
              confirm({
                question: value,
                updatedTimeRange: selectedTimeRange || { selectionFrom: 0, selectionTo: 0 },
                isReinvestigate: checked,
              })
            }
            fill
            disabled={!value.trim()}
          >
            Confirm
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
