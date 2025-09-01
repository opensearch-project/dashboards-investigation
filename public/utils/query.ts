/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const addHeadFilter = (query: string) => {
  return `${query} | eval random_score = rand() | sort random_score | head 100`;
};
