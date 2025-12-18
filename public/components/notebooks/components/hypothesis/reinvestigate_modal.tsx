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
  EuiSpacer,
  EuiSwitch,
  EuiModalFooter,
  EuiButton,
  EuiSuperDatePicker,
  EuiTextArea,
} from '@elastic/eui';
import moment from 'moment';
import dateMath from '@elastic/datemath';

import { InvestigationTimeRange } from '../../../../../common/types/notebooks';

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
    updatedTimeRange: Omit<InvestigationTimeRange, 'baselineFrom' | 'baselineTo'>;
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
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

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

    setSelectedTimeRange({
      selectionFrom: fromMoment?.valueOf() || 0,
      selectionTo: toMoment?.valueOf() || 0,
    });
  }, []);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>Reinvestigate the issue</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFormRow label="Edit initial goal">
            <EuiTextArea value={value} onChange={(e) => setValue(e.target.value)} required />
          </EuiFormRow>
          {!!timeRange && (
            <>
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
            </>
          )}
          <EuiSpacer />
          <EuiSwitch
            label="Bring the existing hypotheses and findings"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton
            onClick={() => {
              confirm({
                question: value,
                updatedTimeRange: selectedTimeRange || ({} as any),
                isReinvestigate: checked,
              });
            }}
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
