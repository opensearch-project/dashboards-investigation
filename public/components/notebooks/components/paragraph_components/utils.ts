/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookType } from '../../../../../common/types/notebooks';

/**
 * Checks if this paragraph is in an agentic notebook and has been run before
 * @param notebookType - The type of notebook
 * @param paragraphIndex - The index of the current paragraph
 * @param totalParagraphs - The total number of paragraphs in the notebook
 * @returns true if the paragraph is agentic and has been run before (not the last paragraph)
 */
export const isAgenticRunBefore = (
  notebookType: NotebookType | undefined,
  paragraphIndex: number,
  totalParagraphs: number
): boolean => {
  return notebookType === NotebookType.AGENTIC && paragraphIndex < totalParagraphs - 1;
};
