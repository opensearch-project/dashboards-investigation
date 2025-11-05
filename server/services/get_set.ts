/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CapabilitiesStart } from '../../../../src/core/server';
import { createGetterSetter } from '../../../../src/plugins/opensearch_dashboards_utils/common';
import { MLService } from './ml_service';
import { QueryService } from './query_service';

export const [getQueryService, setQueryService] = createGetterSetter<QueryService>('QueryService');
export const [getMLService, setMLService] = createGetterSetter<MLService>('MLService');
export const [getCapabilities, setCapabilities] = createGetterSetter<CapabilitiesStart>(
  'capabilities'
);
