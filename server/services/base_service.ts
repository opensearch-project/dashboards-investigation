/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Capabilities,
  CoreSetup,
  Logger,
  OpenSearchDashboardsRequest,
} from '../../../../src/core/server';
import { InternalDynamicConfigServiceStart } from '../../../../src/core/server/config';

export class BaseService {
  private dynamicConfig: InternalDynamicConfigServiceStart | undefined = undefined;

  constructor(private readonly core: CoreSetup, private readonly logger: Logger) {}

  public capabilitiesSwithcer = async (
    request: OpenSearchDashboardsRequest,
    capabilities: Capabilities
  ) => {
    const { dynamicConfigService } = this.core;
    if (this.dynamicConfig === undefined) {
      this.dynamicConfig = await dynamicConfigService.getStartService();
    }
    const store = this.dynamicConfig.getAsyncLocalStore();
    const client = this.dynamicConfig.getClient();
    try {
      const dynamicConfig = await client.getConfig(
        { pluginConfigPath: 'investigation' },
        { asyncLocalStorageContext: store! }
      );

      return {
        investigation: {
          ...capabilities.investigation,
          enabled: dynamicConfig.enabled,
          agenticFeaturesEnabled: dynamicConfig.agenticFeaturesEnabled,
        },
      };
    } catch (e) {
      this.logger.error(e);
      return {};
    }
  };
}
