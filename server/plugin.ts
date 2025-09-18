/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvestigationConfig } from 'server';
import { Observable } from 'rxjs';
import { firstValueFrom } from '@osd/std';
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

export class InvestigationPlugin
  implements Plugin<InvestigationPluginSetup, InvestigationPluginStart> {
  private readonly logger: Logger;
  private readonly config$: Observable<InvestigationConfig>;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config$ = initializerContext.config.create<InvestigationConfig>();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Observability: Setup');
    const router = core.http.createRouter();
    const auth = core.http.auth;
    const config = await firstValueFrom(this.config$);
    core.capabilities.registerProvider(() => {
      return {
        investigation: config,
      };
    });

    setQueryService(new QueryService(this.logger));
    setMLService(new MLService());

    // Register server side APIs
    setupRoutes({
      router,
      auth,
      config,
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
