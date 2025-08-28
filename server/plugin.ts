/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/server';
import { setupRoutes } from './routes/index';
import { notebookSavedObject } from './saved_objects/observability_saved_object';
import { setMLService, setQueryService } from './services/get_set';
import { QueryService } from './services/query_service';
import { MLService } from './services/ml_service';
import { InvestigationPluginSetup, InvestigationPluginStart } from './types';

export class ObservabilityPlugin
  implements Plugin<InvestigationPluginSetup, InvestigationPluginStart> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Observability: Setup');
    const router = core.http.createRouter();
    const auth = core.http.auth;

    setQueryService(new QueryService(this.logger));
    setMLService(new MLService());

    // Register server side APIs
    setupRoutes({
      router,
      auth,
    });

    core.savedObjects.registerType(notebookSavedObject);

    return {};
  }

  public start(_core: CoreStart) {
    this.logger.debug('Observability: Started');
    return {};
  }

  public stop() {}
}
