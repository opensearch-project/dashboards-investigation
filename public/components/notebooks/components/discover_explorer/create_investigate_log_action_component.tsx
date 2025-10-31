/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  InvestigateInputPanel,
  InvestigateInputPanelDedentServices,
} from './investigate_input_panel';

export const createInvestigateLogActionComponent = ({
  services,
}: {
  services: InvestigateInputPanelDedentServices;
}) => {
  return ({ context }: { context: { document: Record<string, any> } }) => {
    return (
      <OpenSearchDashboardsContextProvider services={services}>
        <InvestigateInputPanel log={context.document} />
      </OpenSearchDashboardsContextProvider>
    );
  };
};
