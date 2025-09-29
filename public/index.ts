/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './components/notebooks/index.scss';
import { InvestigationPlugin } from './plugin';
import './variables.scss';

export { InvestigationPlugin as Plugin };

export const plugin = () => new InvestigationPlugin();

export { InvestigationStart } from './types';
