/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { SavedObject } from '../../../../../../src/core/server/types';
import { NotebookContext } from '../../../../common/types/notebooks';

export const updateParagraphText = (
  inputText: string,
  notebookInfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>
) => {
  // Remove prefix. eg: %ppl
  const removedPrefixInput = inputText.substring(4, inputText.length);
  const variables = notebookInfo?.attributes?.savedNotebook?.context?.variables;
  console.log('context', notebookInfo?.attributes?.savedNotebook?.context, 'variables', variables);

  if (!variables) {
    return removedPrefixInput;
  } else {
    // Replace variables with values. eg: ${index} -> 1
    const replacedVariablesInput = removedPrefixInput.replace(
      /\$\{(\w+)\}/g,
      (match, key) => (variables[key] as string) || match
    );
    return replacedVariablesInput;
  }
};
