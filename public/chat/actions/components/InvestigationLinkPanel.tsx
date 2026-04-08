/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiLink, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { useObservable } from 'react-use';
import { CoreStart } from '../../../../../../src/core/public';
import { CreateInvestigationResponse } from '../create_investigation_action';
import { investigationNotebookID } from '../../../../common/constants/shared';

// Investigation Link Panel Component
interface Props {
  result: CreateInvestigationResponse;
  services: CoreStart;
}

export const InvestigationLinkPanel: React.FC<Props> = ({ result, services }) => {
  // Generate the current host URL for the investigation with workspace information
  const currentHost = window.location.origin;
  const investigationPath = result?.notebookId
    ? services.http.basePath.prepend(
        `/app/${investigationNotebookID}#/agentic/${result.notebookId}`
      )
    : '';
  const investigationUrl = result?.notebookId ? `${currentHost}${investigationPath}` : '';
  const truncatedUrl =
    investigationUrl.length > 100 ? `${investigationUrl.substring(0, 97)}...` : investigationUrl;

  const currentAppId = useObservable(services.application.currentAppId$);
  const isInvestigationPage = currentAppId === investigationNotebookID;

  return (
    <EuiPanel paddingSize="s">
      <EuiText size="s">
        <strong>{result.name}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <EuiLink
          onClick={async () => {
            if (result?.notebookId) {
              if (isInvestigationPage) {
                // Open in a new tab when already viewing an investigation
                window.open(investigationUrl, '_blank', 'noopener,noreferrer');
              } else {
                services.application?.navigateToApp(investigationNotebookID, {
                  path: `#/agentic/${result.notebookId}`,
                });
              }
            }
          }}
          color="primary"
        >
          {truncatedUrl}
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};
