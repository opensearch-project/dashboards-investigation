/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/notebook_router';
import { registerParaRoute } from './notebooks/paragraph_router';
import { registerSqlRoute } from './notebooks/sql_router';
import { registerLogPatternRoute } from './notebooks/log_pattern_router';
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
  registerLogPatternRoute(router);

  registerSqlRoute(router, getQueryService(), dataSourceEnabled);
}
