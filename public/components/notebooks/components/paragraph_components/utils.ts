/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookState } from '../../../../../common/state/notebook_state';
import { NotebookType } from '../../../../../common/types/notebooks';

/**
 * Checks if this paragraph is in an agentic notebook and has been run before
 * @param params - Object containing notebook state and paragraph ID
 * @param params.notebookState - The current state of the notebook
 * @param params.id - The ID of the current paragraph
 * @returns true if the paragraph is agentic and has been run before (not the last paragraph)
 */
export const isAgenticRunBefore = (params: {
  notebookState: NotebookState;
  id: string;
}): boolean => {
  const { notebookState, id } = params;

  // Extract notebook type from state
  const notebookType = notebookState?.getContext().notebookType;

  // Find paragraph index from ID
  const paragraphs = notebookState.value.paragraphs;
  const paragraphIndex = paragraphs.findIndex((p) => p.value.id === id);

  // If paragraph ID not found, return false
  if (paragraphIndex === -1) {
    return false;
  }

  // Get total paragraphs
  const totalParagraphs = paragraphs.length;

  return notebookType === NotebookType.AGENTIC && paragraphIndex < totalParagraphs - 1;
};
