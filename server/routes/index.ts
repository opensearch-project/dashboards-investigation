/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/noteRouter';
import { registerParaRoute } from './notebooks/paraRouter';
import { registerSqlRoute } from './notebooks/sqlRouter';
import { registerVizRoute } from './notebooks/vizRouter';
import { registerLogPatternRoute } from './notebooks/logPatternRouter';
import { getQueryService } from '../services/get_set';

export function setupRoutes({
  router,
  dataSourceEnabled,
}: {
  router: IRouter;
  dataSourceEnabled: boolean;
}) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router);
  registerVizRoute(router, dataSourceEnabled);
  registerLogPatternRoute(router);

  registerSqlRoute(router, getQueryService(), dataSourceEnabled);
}
