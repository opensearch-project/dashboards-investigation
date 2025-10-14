/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema, TypeOf } from '@osd/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '../../../src/core/server';
import { ObservabilityPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ObservabilityPlugin(initializerContext);
}

export { ObservabilityPluginSetup, ObservabilityPluginStart } from './types';

const investigationConfig = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
};

export type ObservabilityConfig = TypeOf<typeof investigationConfig.schema>;

export const config: PluginConfigDescriptor<ObservabilityConfig> = {
  schema: investigationConfig.schema,
};
