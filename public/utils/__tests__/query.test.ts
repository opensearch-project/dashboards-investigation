/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { addHeadFilter } from '../query';

describe('addHeadFilter', () => {
  it('should append random sorting and head filter to query', () => {
    const query = 'source=logs';
    const result = addHeadFilter(query);

    expect(result).toBe('source=logs | eval random_score = rand() | sort random_score | head 100');
  });

  it('should handle complex query', () => {
    const query = 'source=logs | where status="error" | stats count by host';
    const result = addHeadFilter(query);

    expect(result).toBe(
      'source=logs | where status="error" | stats count by host | eval random_score = rand() | sort random_score | head 100'
    );
  });
});
