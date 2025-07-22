/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiSmallButton,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useContext, useState } from 'react';
import moment from 'moment';
import { NotebookReactContext } from '../context_provider/context_provider';
import { getCoreStart, getDataSourceManagementSetup } from '../../../services';

interface AddButtonProps {
  addPara: (index: number, newParaContent: string, inputType: string) => Promise<void>;
}

export const ContextPanel = ({ addPara }: AddButtonProps) => {
  const context = useContext(NotebookReactContext);
  const coreStart = getCoreStart();
  const dataSourceManagementSetup = getDataSourceManagementSetup();
  const [isLoading, setIsLoading] = useState(false);

  const fetchBubbleData = useCallback(async () => {
    setIsLoading(true);
    try {
      await addPara(0, '', 'ANOMALY_VISUALIZATION_ANALYSIS');
    } catch (error) {
      console.log(error);
    }
    setIsLoading(false);
  }, [addPara]);

  if (!context) {
    return null;
  }

  const DataSourceSelector =
    dataSourceManagementSetup.enabled &&
    dataSourceManagementSetup.dataSourceManagement.ui.DataSourceSelector;
  const indexOptions = [{ label: context.index ?? '', id: context.index ?? '' }];

  return (
    <>
      <EuiSpacer />
      <EuiPanel>
        <EuiTitle>
          <h3>Global Context</h3>
        </EuiTitle>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {DataSourceSelector ? (
            <EuiFlexItem>
              <DataSourceSelector
                savedObjectsClient={coreStart.savedObjects.client}
                disabled
                notifications={coreStart.notifications.toasts}
                onSelectedDataSource={() => {}}
                fullWidth
                defaultOption={[
                  {
                    id: context.dataSourceId || '',
                  },
                ]}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              isDisabled={true}
              prepend="Index"
              options={indexOptions}
              selectedOptions={indexOptions}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDatePickerRange
              readOnly={true}
              startDateControl={
                <EuiDatePicker
                  selected={moment(context?.timeRange?.from)}
                  onChange={() => {}}
                  aria-label="Start date"
                  showTimeSelect
                />
              }
              endDateControl={
                <EuiDatePicker
                  selected={moment(context?.timeRange?.to)}
                  onChange={() => {}}
                  aria-label="End date"
                  showTimeSelect
                />
              }
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSmallButton
              data-test-subj="paragraphToggleBubbleUpBtn"
              aria-label="Bubble up button"
              onClick={fetchBubbleData}
              isLoading={isLoading}
            >
              Analyze data
            </EuiSmallButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
