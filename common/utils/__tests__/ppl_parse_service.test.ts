/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { parsePPLQuery } from '../ppl_parse_service';

describe('PPL Parse Service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('parsePPLQuery', () => {
    it('should return original query when no relative time functions are used', () => {
      const query = "source=logs | where status='error'";
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(query);
    });

    it('should replace NOW() with current timestamp', () => {
      const query = 'source=logs | where timestamp > NOW()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp > '2023-01-01 12:00:00'"
      );
    });

    it('should replace CURDATE() with current date', () => {
      const query = 'source=logs | where date = CURDATE()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe("source=logs | where date = '2023-01-01'");
    });

    it('should replace CURRENT_DATE() with current date', () => {
      const query = 'source=logs | where date = CURRENT_DATE()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe("source=logs | where date = '2023-01-01'");
    });

    it('should replace CURRENT_TIME() with current time', () => {
      const query = 'source=logs | where time = CURRENT_TIME()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe("source=logs | where time = '12:00:00'");
    });

    it('should replace CURRENT_TIMESTAMP() with current timestamp', () => {
      const query = 'source=logs | where timestamp = CURRENT_TIMESTAMP()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp = '2023-01-01 12:00:00'"
      );
    });

    it('should handle multiple relative time functions in one query', () => {
      const query = 'source=logs | where timestamp > NOW() AND date = CURDATE()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp > '2023-01-01 12:00:00' AND date = '2023-01-01'"
      );
    });

    it('should handle case insensitive function names', () => {
      const query = 'source=logs | where timestamp > now()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp > '2023-01-01 12:00:00'"
      );
    });

    it('should handle complex queries with nested functions', () => {
      const query = 'source=logs | eval current_time = NOW() | where created_date >= CURDATE()';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | eval current_time = '2023-01-01 12:00:00' | where created_date >= '2023-01-01'"
      );
    });

    it('should preserve query structure when no replacements are needed', () => {
      const query = 'source=logs | stats count() by status | sort count desc';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(query);
    });

    it('should replace NOW() within DATE_ADD function', () => {
      const query = 'source=logs | where timestamp > DATE_ADD(NOW(), INTERVAL 1 DAY)';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp > DATE_ADD('2023-01-01 12:00:00', INTERVAL 1 DAY)"
      );
    });

    it('should replace NOW() within DATE_SUB function', () => {
      const query = 'source=logs | where timestamp < DATE_SUB(NOW(), INTERVAL 1 HOUR)';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp < DATE_SUB('2023-01-01 12:00:00', INTERVAL 1 HOUR)"
      );
    });

    it('should replace CURDATE() within DATE_ADD function', () => {
      const query = 'source=logs | where date >= DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where date >= DATE_ADD('2023-01-01', INTERVAL 7 DAY)"
      );
    });

    it('should replace multiple time functions in DATE_ADD/DATE_SUB expressions', () => {
      const query =
        'source=logs | where timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY) AND timestamp <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | where timestamp >= DATE_SUB('2023-01-01 12:00:00', INTERVAL 1 DAY) AND timestamp <= DATE_ADD('2023-01-01', INTERVAL 1 DAY)"
      );
    });

    it('should handle nested DATE functions with relative time', () => {
      const query =
        'source=ss4o_logs-otel-2025.08* | where time >= DATE_SUB(NOW(), INTERVAL 2 DAY)  | head 10';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=ss4o_logs-otel-2025.08* | where time >= DATE_SUB('2023-01-01 12:00:00', INTERVAL 2 DAY)  | head 10"
      );
    });

    it('should handle function within backtick', () => {
      const query =
        'source=logs | eval `current_time()` = NOW() | where time >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)  | head 10';
      const result = parsePPLQuery(query);

      expect(result.pplWithAbsoluteTime).toBe(
        "source=logs | eval `current_time()` = '2023-01-01 12:00:00' | where time >= DATE_SUB('2023-01-01', INTERVAL 2 DAY)  | head 10"
      );
    });

    it('should return correct fromClause', () => {
      const query =
        'source=logs | eval `current_time()` = NOW() | where time >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)  | head 10';
      const result = parsePPLQuery(query);

      expect(result.fromClause?.text).toBe('source=logs');
    });
  });
});
