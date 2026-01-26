/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpAuth, IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/notebook_router';
import { registerParaRoute } from './notebooks/paragraph_router';
import { registerLogPatternRoute } from './notebooks/log_pattern_router';
import { registerHypothesisRoute } from './notebooks/hypothesis_router';
import { registerMLConnectorRoute } from './notebooks/ml_router';
import { registerAgentExecutionRoute } from './notebooks/agent_router';
import { registerVisualizationSummaryRoute } from './notebooks/visualization_summary';

export function setupRoutes({ router, auth }: { router: IRouter; auth: HttpAuth }) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router, auth);
  registerLogPatternRoute(router);
  registerHypothesisRoute(router);
  registerMLConnectorRoute(router);
  registerAgentExecutionRoute(router);
  registerVisualizationSummaryRoute(router);
}
