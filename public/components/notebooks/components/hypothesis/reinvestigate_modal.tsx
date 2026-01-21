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
  EuiSplitPanel,
} from '@elastic/eui';
import moment from 'moment';
import dateMath from '@elastic/datemath';

import { InvestigationTimeRange } from '../../../../../common/types/notebooks';

type DatePickerTimeRange = Omit<InvestigationTimeRange, 'baselineFrom' | 'baselineTo'> | undefined;

interface ReinvestigateModalProps {
  initialGoal: string;
  initialFeedbackSummary: string;
  timeRange: DatePickerTimeRange | undefined;
  dateFormat: string;
  defaultToggleOn?: boolean;
  confirm: (params: {
    question: string;
    updatedTimeRange: DatePickerTimeRange;
    isReinvestigate: boolean;
    updatedfeedbackSummary: string;
  }) => void;
  closeModal: () => void;
}

export const ReinvestigateModal: React.FC<ReinvestigateModalProps> = ({
  initialGoal,
  initialFeedbackSummary,
  timeRange,
  dateFormat,
  defaultToggleOn = false,
  confirm,
  closeModal,
}) => {
  const [value, setValue] = useState(initialGoal);
  const [checked, setChecked] = useState(defaultToggleOn);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [feedbackSummary, setFeedbackSummary] = useState(initialFeedbackSummary);

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
        <EuiModalBody style={{ padding: 0 }}>
          <EuiSplitPanel.Outer
            hasShadow={false}
            hasBorder={false}
            direction="row"
            style={{ gap: 16 }}
          >
            <EuiSplitPanel.Inner paddingSize="none">
              <div>
                <EuiFormRow label="Edit initial goal">
                  <EuiTextArea
                    rows={5}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                  />
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
              </div>
            </EuiSplitPanel.Inner>
            {initialFeedbackSummary && checked && (
              <EuiSplitPanel.Inner paddingSize="none">
                <EuiFormRow label="Previous feedback summary">
                  <EuiTextArea
                    rows={10}
                    value={feedbackSummary}
                    style={{ width: 300 }}
                    onChange={(e) => setFeedbackSummary(e.target.value)}
                    placeholder="Enter feedback summary..."
                  />
                </EuiFormRow>
              </EuiSplitPanel.Inner>
            )}
          </EuiSplitPanel.Outer>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton
            onClick={() => {
              confirm({
                question: value,
                updatedTimeRange: selectedTimeRange,
                isReinvestigate: checked,
                updatedfeedbackSummary: feedbackSummary,
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
