/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { InvestigateInput, InvestigateInputDedentServices } from './investigate_input';

export const createInvestigateLogActionComponent = ({
  services,
}: {
  services: InvestigateInputDedentServices;
}) => {
  return ({ context }: { context: { document: Record<string, any> } }) => {
    return (
      <OpenSearchDashboardsContextProvider services={services}>
        <EuiPanel style={{ minWidth: 400 }}>
          <InvestigateInput log={context.document} />
        </EuiPanel>
      </OpenSearchDashboardsContextProvider>
    );
  };
};
