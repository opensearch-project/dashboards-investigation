/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCodeBlock } from '@elastic/eui';

import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  StartInvestigationModal,
  StartInvestigateModalDedentServices,
  NotebookCreationPayload,
} from './start_investigation_modal';
import { NoteBookSource, NotebookType } from '../../../../../common/types/notebooks';

export const createInvestigateLogActionComponent = ({
  services,
}: {
  services: StartInvestigateModalDedentServices;
}) => {
  return ({
    context,
    onClose,
  }: {
    context: { document: Record<string, any> };
    onClose: () => void;
  }) => {
    const handleProvideNotebookParameters = async (
      defaultParameters: NotebookCreationPayload
    ): Promise<NotebookCreationPayload> => {
      const query = services.data.query.queryString.getQuery();

      return {
        ...defaultParameters,
        context: {
          ...defaultParameters.context,
          dataSourceId: query.dataset?.dataSource?.id ?? '',
          source: NoteBookSource.DISCOVER,
          index: query.dataset?.title ?? '',
          notebookType: NotebookType.AGENTIC,
          timeField: query.dataset?.timeFieldName ?? '',
          log: context.document,
        },
      };
    };

    const logDisplay = (
      <EuiPanel>
        <EuiText>You selected:</EuiText>
        <EuiSpacer size="xs" />
        <EuiCodeBlock language="json" isCopyable={true} overflowHeight={160}>
          {JSON.stringify(context.document, null, 2)}
        </EuiCodeBlock>
      </EuiPanel>
    );

    return (
      <OpenSearchDashboardsContextProvider services={services}>
        <StartInvestigationModal
          closeModal={onClose}
          onProvideNotebookParameters={handleProvideNotebookParameters}
          additionalContent={logDisplay}
        />
      </OpenSearchDashboardsContextProvider>
    );
  };
};
