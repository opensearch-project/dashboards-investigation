/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const inputIsQuery = (inputText: string) => {
  return inputIsSQL(inputText) || inputIsPPL(inputText);
};

export const inputIsSQL = (inputText: string) => {
  return inputText.substring(0, 4) === '%sql';
};

export const inputIsPPL = (inputText: string) => {
  return inputText.substring(0, 4) === '%ppl';
};

export const formatNotRecognized = (inputText: string) => {
  return (
    inputText.substring(0, 4) !== '%sql' &&
    inputText.substring(0, 4) !== '%ppl' &&
    inputText.substring(0, 3) !== '%md'
  );
};
