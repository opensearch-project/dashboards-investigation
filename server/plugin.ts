/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../common/constants/notebooks';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/server';
import { setupRoutes } from './routes/index';
import { notebookSavedObject } from './saved_objects/observability_saved_object';
import { ParagraphService } from './services/paragraph_service';
import { AnomalyVisualizationAnalysisParagraph } from './paragraphs/anomaly_visualization_analytics';
import { setParagraphServiceSetup, setQueryService } from './services/get_set';
import { QueryService } from './services/query_service';
import { PPLParagraph } from './paragraphs/ppl';
import { LogPatternParagraph } from './paragraphs/log_sequence';
import { InvestigationPluginSetup, InvestigationPluginStart } from './types';

export class ObservabilityPlugin
  implements Plugin<InvestigationPluginSetup, InvestigationPluginStart> {
  private readonly logger: Logger;
  private paragraphService: ParagraphService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.paragraphService = new ParagraphService();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Observability: Setup');
    const router = core.http.createRouter();

    setQueryService(new QueryService(this.logger));

    const paragraphServiceSetup = this.paragraphService.setup();

    setParagraphServiceSetup(paragraphServiceSetup);

    paragraphServiceSetup.register(
      ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
      AnomalyVisualizationAnalysisParagraph
    );
    paragraphServiceSetup.register(PPL_PARAGRAPH_TYPE, PPLParagraph);
    paragraphServiceSetup.register(LOG_PATTERN_PARAGRAPH_TYPE, LogPatternParagraph);

    // Register server side APIs
    setupRoutes({
      router,
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
