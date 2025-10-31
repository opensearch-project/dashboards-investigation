/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvestigationConfig } from 'server';
import { HttpAuth, IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/notebook_router';
import { registerParaRoute } from './notebooks/paragraph_router';
import { registerLogPatternRoute } from './notebooks/log_pattern_router';
import { registerHypothesisRoute } from './notebooks/hypothesis_router';
import { registerMLServiceRoute } from './notebooks/ml_service_router';

export function setupRoutes({
  router,
  auth,
  config,
}: {
  router: IRouter;
  auth: HttpAuth;
  config: InvestigationConfig;
}) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router, auth, config);
  registerLogPatternRoute(router);
  registerHypothesisRoute(router);
  registerMLServiceRoute(router);
}
