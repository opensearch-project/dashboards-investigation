/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PluginInitializerContext } from '../../../src/core/public';
import './components/notebooks/index.scss';
import { InvestigationPlugin } from './plugin';
import './variables.scss';

export { InvestigationPlugin as Plugin };

export const plugin = (initializerContext: PluginInitializerContext) =>
  new InvestigationPlugin(initializerContext);

export { ObservabilityStart } from './types';
