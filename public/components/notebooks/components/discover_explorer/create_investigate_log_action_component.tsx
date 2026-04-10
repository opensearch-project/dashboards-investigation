/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@osd/i18n';

import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  StartInvestigationModal,
  StartInvestigateModalDedentServices,
  NotebookCreationPayload,
  SuggestedAction,
} from './start_investigation_modal';
import { NoteBookSource, NotebookType } from '../../../../../common/types/notebooks';

const suggestedActions: SuggestedAction[] = [
  {
    name: i18n.translate(
      'investigate.discoverExplorer.investigateLogAction.suggestedAction.rootCause.name',
      { defaultMessage: 'Root cause analysis' }
    ),
    question: i18n.translate(
      'investigate.discoverExplorer.investigateLogAction.suggestedAction.rootCause.question',
      { defaultMessage: 'Why did this error happen? Analyze the root cause of this log entry.' }
    ),
  },
  {
    name: i18n.translate(
      'investigate.discoverExplorer.investigateLogAction.suggestedAction.performance.name',
      { defaultMessage: 'Performance issues' }
    ),
    question: i18n.translate(
      'investigate.discoverExplorer.investigateLogAction.suggestedAction.performance.question',
      {
        defaultMessage: 'Why does this request take time? Identify the bottleneck of this request.',
      }
    ),
  },
];

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
          suggestedActions={suggestedActions}
        />
      </OpenSearchDashboardsContextProvider>
    );
  };
};
