/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from '../../../../src/core/server';
import { registerNoteRoute } from './notebooks/notebook_router';
import { registerParaRoute } from './notebooks/paragraph_router';
import { registerLogPatternRoute } from './notebooks/log_pattern_router';

export function setupRoutes({ router }: { router: IRouter }) {
  // notebooks routes
  registerParaRoute(router);
  registerNoteRoute(router);
  registerLogPatternRoute(router);
}
