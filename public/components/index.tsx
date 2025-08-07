/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '../../../../src/core/public';
import { NoteBookServices } from '../types';
import { App } from './app';
import { OpenSearchDashboardsContextProvider } from '../../../../src/plugins/opensearch_dashboards_react/public';

export const Observability = (
  services: NoteBookServices,
  AppMountParametersProp: AppMountParameters
) => {
  ReactDOM.render(
    <OpenSearchDashboardsContextProvider services={services}>
      <App />
    </OpenSearchDashboardsContextProvider>,
    AppMountParametersProp.element
  );

  return () => ReactDOM.unmountComponentAtNode(AppMountParametersProp.element);
};
