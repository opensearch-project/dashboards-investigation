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
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { useParagraphs } from '../../../hooks/use_paragraphs';
import { NotebookReactContext } from '../context_provider/context_provider';
import { getDataSourceManagementSetup } from '../../../services';
import { ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE } from '../../../../common/constants/notebooks';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

export const ContextPanel = () => {
  const context = useContext(NotebookReactContext);
  const { index, dataSourceId, timeRange } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );
  const { createParagraph } = useParagraphs();
  const {
    services: { savedObjects: savedObjectsMDSClient, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const dataSourceManagementSetup = getDataSourceManagementSetup();
  const [isLoading, setIsLoading] = useState(false);

  const fetchBubbleData = useCallback(async () => {
    setIsLoading(true);
    try {
      await createParagraph(0, '', ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE);
    } catch (error) {
      console.log(error);
    }
    setIsLoading(false);
  }, [createParagraph]);

  if (!index) {
    return null;
  }

  const DataSourceSelector =
    dataSourceManagementSetup.enabled &&
    dataSourceManagementSetup.dataSourceManagement.ui.DataSourceSelector;
  const indexOptions = [{ label: index ?? '', id: index ?? '' }];

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
                savedObjectsClient={savedObjectsMDSClient.client}
                disabled
                notifications={notifications.toasts}
                onSelectedDataSource={() => {}}
                fullWidth
                defaultOption={[
                  {
                    id: dataSourceId || '',
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
                  selected={moment(timeRange?.selectionFrom)}
                  onChange={() => {}}
                  aria-label="Start date"
                  showTimeSelect
                />
              }
              endDateControl={
                <EuiDatePicker
                  selected={moment(timeRange?.selectionTo)}
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
