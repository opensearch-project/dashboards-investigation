/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, dataSourceFilterFn } from './shared';
import { SavedObject } from '../../../../src/core/public';
import { DataSourceAttributes } from '../../../../src/plugins/data_source/common/data_sources';

describe('shared utils', () => {
  describe('get', () => {
    it('should get nested property value', () => {
      const obj = {
        a: {
          b: {
            c: 'value',
          },
        },
      };
      expect(get(obj, 'a.b.c')).toBe('value');
    });

    it('should return undefined for non-existent path', () => {
      const obj = {
        a: {
          b: 'value',
        },
      };
      expect(get(obj, 'a.c.d')).toBeUndefined();
    });

    it('should return default value when path does not exist', () => {
      const obj = {
        a: {
          b: 'value',
        },
      };
      expect(get(obj, 'a.c.d', 'default')).toBe('default');
    });

    it('should get top-level property', () => {
      const obj = {
        name: 'test',
      };
      expect(get(obj, 'name')).toBe('test');
    });

    it('should handle empty path', () => {
      const obj = {
        a: 'value',
      };
      expect(get(obj, '')).toBeUndefined();
    });

    it('should handle null or undefined values in path', () => {
      const obj = {
        a: null,
      };
      expect(get(obj, 'a.b.c')).toBeUndefined();
    });

    it('should return default value for empty object', () => {
      const obj = {};
      expect(get(obj, 'a.b.c', 'default')).toBe('default');
    });

    it('should handle numeric property access', () => {
      const obj = {
        items: {
          0: 'first',
          1: 'second',
        },
      };
      expect(get(obj, 'items.0')).toBe('first');
      expect(get(obj, 'items.1')).toBe('second');
    });

    it('should handle boolean values', () => {
      const obj = {
        a: {
          b: false,
        },
      };
      // False is falsy, so it returns undefined without default value
      expect(get(obj, 'a.b', false)).toBe(false);
    });

    it('should handle zero values', () => {
      const obj = {
        a: {
          b: 0,
        },
      };
      // Zero is falsy, so it returns undefined without default value
      expect(get(obj, 'a.b', 0)).toBe(0);
    });
  });

  describe('dataSourceFilterFn', () => {
    it('should return true for serverless data source', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds1',
        type: 'data-source',
        attributes: {
          title: 'Serverless DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '2.9.0',
          dataSourceEngineType: 'OpenSearch Serverless' as any,
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(true);
    });

    it('should return true for compatible version with required plugins', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds2',
        type: 'data-source',
        attributes: {
          title: 'OpenSearch DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '2.9.0',
          installedPlugins: ['opensearch-sql'],
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(true);
    });

    it('should return false for missing required plugins', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds3',
        type: 'data-source',
        attributes: {
          title: 'OpenSearch DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '2.9.0',
          installedPlugins: [],
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(false);
    });

    it('should return false for incompatible version', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds4',
        type: 'data-source',
        attributes: {
          title: 'OpenSearch DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '1.0.0',
          installedPlugins: ['opensearch-sql'],
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(false);
    });

    it('should handle missing dataSourceVersion', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds5',
        type: 'data-source',
        attributes: {
          title: 'OpenSearch DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '',
          installedPlugins: ['opensearch-sql'],
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(false);
    });

    it('should handle missing installedPlugins', () => {
      const dataSource: SavedObject<DataSourceAttributes> = {
        id: 'ds6',
        type: 'data-source',
        attributes: {
          title: 'OpenSearch DS',
          endpoint: 'https://example.com',
          dataSourceVersion: '2.9.0',
          installedPlugins: undefined as any,
          auth: { type: 'no_auth', credentials: undefined },
        },
        references: [],
      };
      expect(dataSourceFilterFn(dataSource)).toBe(false);
    });
  });
});
