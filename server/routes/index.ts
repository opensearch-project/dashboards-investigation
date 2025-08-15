/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpAuth, IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/notebook_router';
import { registerParaRoute } from './notebooks/paragraph_router';
import { registerLogPatternRoute } from './notebooks/log_pattern_router';

export function setupRoutes({ router, auth }: { router: IRouter; auth: HttpAuth }) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router, auth);
  registerLogPatternRoute(router);
}
