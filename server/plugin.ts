/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../common/constants/notebooks';
import {
  CoreSetup,
  CoreStart,
  ILegacyClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/server';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/server/types';
import { DataSourceManagementPlugin } from '../../../src/plugins/data_source_management/public/plugin';
import { PPLPlugin } from './adaptors/ppl_plugin';
import { setupRoutes } from './routes/index';
import { notebookSavedObject } from './saved_objects/observability_saved_object';
import { ParagraphService } from './services/paragraph_service';
import { ObservabilityPluginSetup, ObservabilityPluginStart } from './types';
import { AnomalyVisualizationAnalysisParagraph } from './paragraphs/anomaly_visualization_analytics';
import { setClusterClient, setParagraphServiceSetup, setQueryService } from './services/get_set';
import { QueryService } from './services/query_service';
import { PPLParagraph } from './paragraphs/ppl';

export interface ObservabilityPluginSetupDependencies {
  dataSourceManagement: ReturnType<DataSourceManagementPlugin['setup']>;
  dataSource: DataSourcePluginSetup;
}

export class ObservabilityPlugin
  implements Plugin<ObservabilityPluginSetup, ObservabilityPluginStart> {
  private readonly logger: Logger;
  private paragraphService: ParagraphService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.paragraphService = new ParagraphService();
  }

  public async setup(
    core: CoreSetup,
    deps: {
      dataSource: ObservabilityPluginSetupDependencies;
    }
  ) {
    const { dataSource } = deps;
    this.logger.debug('Observability: Setup');
    const router = core.http.createRouter();

    const dataSourceEnabled = !!dataSource;
    const openSearchObservabilityClient: ILegacyClusterClient = core.opensearch.legacy.createClient(
      'opensearch_notebook',
      {
        plugins: [PPLPlugin],
      }
    );

    setClusterClient(openSearchObservabilityClient);
    setQueryService(new QueryService(this.logger));

    if (dataSourceEnabled) {
      dataSource.registerCustomApiSchema(PPLPlugin);
    }

    const paragraphServiceSetup = this.paragraphService.setup();

    setParagraphServiceSetup(paragraphServiceSetup);

    paragraphServiceSetup.register(
      ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
      AnomalyVisualizationAnalysisParagraph
    );
    paragraphServiceSetup.register(PPL_PARAGRAPH_TYPE, PPLParagraph);

    // Register server side APIs
    setupRoutes({
      router,
      dataSourceEnabled,
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
