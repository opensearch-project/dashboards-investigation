/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  StartInvestigationModal,
  StartInvestigateModalDedentServices,
} from './start_investigation_modal';

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
    return (
      <OpenSearchDashboardsContextProvider services={services}>
        <StartInvestigationModal log={context.document} closeModal={onClose} />
      </OpenSearchDashboardsContextProvider>
    );
  };
};
