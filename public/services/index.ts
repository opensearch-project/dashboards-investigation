/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart } from '../../../../src/core/public';
import { DataPublicPluginStart, ISearchStart } from '../../../../src/plugins/data/public';
import { DataSourceManagementPluginSetup } from '../../../../src/plugins/data_source_management/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { ExpressionsStart } from '../../../../src/plugins/expressions/public';
import { createGetterSetter } from '../../../../src/plugins/opensearch_dashboards_utils/common';

export const [getExpressions, setExpressions] = createGetterSetter<ExpressionsStart>('Expressions');
export const [getData, setData] = createGetterSetter<DataPublicPluginStart>('Data');
export const [getEmbeddable, setEmbeddable] = createGetterSetter<EmbeddableStart>('embeddable');
export const [getSearch, setSearch] = createGetterSetter<ISearchStart>('Search');
export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');
export const [getDataSourceManagementSetup, setDataSourceManagementSetup] = createGetterSetter<
  | { enabled: true; dataSourceManagement: DataSourceManagementPluginSetup }
  | { enabled: false; dataSourceManagement: undefined }
>('DataSourceManagementSetup');
export const [getClient, setClient] = createGetterSetter<CoreStart['http']>('http');
