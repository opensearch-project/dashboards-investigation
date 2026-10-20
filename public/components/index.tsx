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
  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = AppMountParametersProp.history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  ReactDOM.render(
    <OpenSearchDashboardsContextProvider services={services}>
      <App />
    </OpenSearchDashboardsContextProvider>,
    AppMountParametersProp.element
  );

  return () => {
    unlistenParentHistory();
    ReactDOM.unmountComponentAtNode(AppMountParametersProp.element);
  };
};
