/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { SavedObject } from '../../../../../../src/core/server/types';
import { NotebookContext } from '../../../../common/types/notebooks';

// Helper function to get nested value from object (similar to Lodash _.get)
const getNestedValue = (obj: any, path: string, defaultValue: any = undefined): any => {
  if (!obj || !path) return defaultValue;

  // Split by dots first, then handle array notation
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }

    // Handle array notation like [0] or [1]
    if (part.includes('[') && part.includes(']')) {
      // Extract the property name and array index
      const match = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (match) {
        const [, propName, index] = match;
        if (propName) {
          current = current[propName];
          if (current === null || current === undefined || !Array.isArray(current)) {
            return defaultValue;
          }
          current = current[parseInt(index, 10)];
        } else {
          // Direct array access like [0]
          current = current[parseInt(index, 10)];
        }
      } else {
        return defaultValue;
      }
    } else {
      current = current[part];
    }

    if (current === undefined) {
      return defaultValue;
    }
  }

  return current;
};

export const updateParagraphText = (
  inputText: string,
  notebookInfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>
) => {
  // Remove prefix. eg: %ppl
  const removedPrefixInput = inputText.replace(/^%\w+\s+/, '');
  const context = notebookInfo?.attributes?.savedNotebook?.context;

  if (!context) {
    return removedPrefixInput;
  } else {
    // Replace variables with values. eg: ${context.a[0].b.c} -> value
    const replacedVariablesInput = removedPrefixInput.replace(/\$\{([^}]+)\}/g, (match, path) => {
      // Currently we only support to retrieve value from context. So remove 'context.' prefix if it exists
      const cleanPath = path.startsWith('context.') ? path.substring(8) : path;
      const value = getNestedValue(context, cleanPath);
      // Handle null values - return "null" string instead of keeping placeholder
      if (value === null) {
        return 'null';
      }
      if (value !== undefined) {
        return String(value);
      }
      return match;
    });
    return replacedVariablesInput;
  }
};
