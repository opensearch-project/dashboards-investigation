/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema, TypeOf } from '@osd/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '../../../src/core/server';
import { InvestigationPlugin } from './plugin';

declare module '../../../src/core/types/capabilities' {
  interface Capabilities {
    investigation: InvestigationConfig;
  }
}

export function plugin(initializerContext: PluginInitializerContext) {
  return new InvestigationPlugin(initializerContext);
}

export { InvestigationPluginSetup, InvestigationPluginStart } from './types';

const investigationConfig = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    agenticFeaturesEnabled: schema.boolean({ defaultValue: false }),
  }),
};

export type InvestigationConfig = TypeOf<typeof investigationConfig.schema>;

export const config: PluginConfigDescriptor<InvestigationConfig> = {
  schema: investigationConfig.schema,
};
