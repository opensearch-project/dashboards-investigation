/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ENABLE_AI_FEATURES } from '../../common/constants/shared';
import {
  Capabilities,
  CoreSetup,
  CoreStart,
  Logger,
  OpenSearchDashboardsRequest,
} from '../../../../src/core/server';
import { InternalDynamicConfigServiceStart } from '../../../../src/core/server/config';

export class BaseService {
  private dynamicConfig: InternalDynamicConfigServiceStart | undefined = undefined;
  private coreStart: CoreStart | undefined = undefined;

  constructor(private readonly core: CoreSetup, private readonly logger: Logger) {}

  public capabilitiesSwitcher = async (
    request: OpenSearchDashboardsRequest,
    capabilities: Capabilities
  ) => {
    const { dynamicConfigService } = this.core;
    if (this.dynamicConfig === undefined) {
      this.dynamicConfig = await dynamicConfigService.getStartService();
    }
    const store = this.dynamicConfig.getAsyncLocalStore();
    const client = this.dynamicConfig.getClient();

    if (!this.coreStart) {
      const [coreStart] = await this.core.getStartServices();
      this.coreStart = coreStart;
    }
    const savedObjectsClient = this.coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = this.coreStart.uiSettings.asScopedToClient(savedObjectsClient);

    const isAgenticFeatureEnabledBySetting = Boolean(
      await uiSettingsClient.get(ENABLE_AI_FEATURES).catch(() => false)
    );

    try {
      const dynamicConfig = await client.getConfig(
        { pluginConfigPath: 'investigation' },
        { asyncLocalStorageContext: store! }
      );

      return {
        investigation: {
          ...capabilities.investigation,
          enabled: dynamicConfig.enabled,
          agenticFeaturesEnabled:
            dynamicConfig.agenticFeaturesEnabled && isAgenticFeatureEnabledBySetting,
        },
      };
    } catch (e) {
      this.logger.error(e);
      return {};
    }
  };
}
