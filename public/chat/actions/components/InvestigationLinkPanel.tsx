/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiLink, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { CoreStart } from '../../../../../../src/core/public';
import { CreateInvestigationResponse } from '../create_investigation_action';

// Investigation Link Panel Component
interface Props {
  result: CreateInvestigationResponse;
  services: CoreStart;
}

export const InvestigationLinkPanel: React.FC<Props> = ({ result, services }) => {
  // Generate the current host URL for the investigation
  const currentHost = window.location.origin;
  const investigationUrl = result?.notebookId
    ? `${currentHost}/app/investigation-notebooks#/agentic/${result.notebookId}`
    : '';
  const truncatedUrl =
    investigationUrl.length > 50 ? `${investigationUrl.substring(0, 47)}...` : investigationUrl;

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiText size="s">
        <strong>{result.name}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <EuiLink
          onClick={async () => {
            if (result?.notebookId) {
              services.application?.navigateToApp('investigation-notebooks', {
                path: `#/agentic/${result.notebookId}`,
              });
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
