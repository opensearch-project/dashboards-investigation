/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createGetterSetter } from '../../../../src/plugins/opensearch_dashboards_utils/common';
import { ParagraphServiceSetup } from './paragraph_service';
import { QueryService } from './query_service';

export const [getQueryService, setQueryService] = createGetterSetter<QueryService>('QueryService');
export const [getParagraphServiceSetup, setParagraphServiceSetup] = createGetterSetter<
  ParagraphServiceSetup
>('ParagraphServiceSetup');
