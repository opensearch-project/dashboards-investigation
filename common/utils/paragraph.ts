/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphBackendType } from 'common/types/notebooks';

export const extractCodeBlockType = (content: string) => {
  const regexp = /^%(\w+)\s+/;
  return content.match(regexp)?.[1] || '';
};

export const getInputType = <T>(paragraph: ParagraphBackendType<T>) => {
  const inputType = paragraph.input.inputType;
  if (inputType === 'MARKDOWN' || inputType === 'CODE') {
    return extractCodeBlockType(paragraph.input.inputText);
  }

  return inputType;
};
