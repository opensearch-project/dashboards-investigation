/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import semver from 'semver';
import { SavedObject } from '../../../../src/core/public';
import { DataSourceAttributes } from '../../../../src/plugins/data_source/common/data_sources';
import * as pluginManifest from '../../opensearch_dashboards.json';
import { LOG_PATTERN_MIN_SUPPORTED_VERSION } from '../../common/constants/notebooks';

/**
 * TODO making this method type-safe is nontrivial: if you just define
 * `Nested<T> = { [k: string]: Nested<T> | T }` then you can't accumulate because `T` is not `Nested<T>`
 * There might be a way to define a recursive type that accumulates cleanly but it's probably not
 * worth the effort.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get<T = unknown>(obj: Record<string, any>, path: string, defaultValue?: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return path.split('.').reduce((acc: any, part: string) => acc && acc[part], obj) || defaultValue;
}

export const supportsLogPatternAnalysis = (dataSourceVersion: string | undefined): boolean => {
  if (!dataSourceVersion) return true;
  const coerced = semver.coerce(dataSourceVersion);
  if (!coerced) return true;
  return semver.gte(coerced, LOG_PATTERN_MIN_SUPPORTED_VERSION, { loose: true });
};

export const dataSourceFilterFn = (dataSource: SavedObject<DataSourceAttributes>) => {
  const dataSourceVersion = dataSource?.attributes?.dataSourceVersion || '';
  const installedPlugins = dataSource?.attributes?.installedPlugins || [];
  // Using DataSourceEngineType.opensearchServerless requires make data source as a required bundles of investigation.
  const isServerless = dataSource.attributes.dataSourceEngineType === 'OpenSearch Serverless';
  return (
    isServerless ||
    (semver.satisfies(dataSourceVersion, pluginManifest.supportedOSDataSourceVersions) &&
      pluginManifest.requiredOSDataSourcePlugins.every((plugin) =>
        installedPlugins.includes(plugin)
      ))
  );
};
