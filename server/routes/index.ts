/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ILegacyClusterClient, IRouter, Logger } from '../../../../src/core/server';
import { QueryService } from '../services/queryService';
import { registerNoteRoute } from './notebooks/noteRouter';
import { registerParaRoute } from './notebooks/paraRouter';
import { registerSqlRoute } from './notebooks/sqlRouter';
import { registerVizRoute } from './notebooks/vizRouter';
import { registerLogPatternRoute } from './notebooks/logPatternRouter';

export function setupRoutes({
  router,
  client,
  dataSourceEnabled,
  logger,
}: {
  router: IRouter;
  client: ILegacyClusterClient;
  dataSourceEnabled: boolean;
  logger: Logger;
}) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router);
  registerVizRoute(router, dataSourceEnabled);
  registerLogPatternRoute(router);

  const queryService = new QueryService(client, logger);
  registerSqlRoute(router, queryService, dataSourceEnabled);
}
