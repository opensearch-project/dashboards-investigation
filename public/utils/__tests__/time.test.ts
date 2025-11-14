/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for time utility functions.
 *
 * This test suite covers:
 * - formatTimeGap: Formats milliseconds into human-readable time strings
 * - getTimeGapFromDates: Calculates time difference between two moment objects
 */

import moment from 'moment';
import { formatTimeGap, getTimeGapFromDates, formatTimeRangeString } from '../time';

describe('time utilities', () => {
  describe('formatTimeGap', () => {
    it('should return error message for negative milliseconds', () => {
      expect(formatTimeGap(-1)).toBe('Invalid input: negative time');
      expect(formatTimeGap(-1000)).toBe('Invalid input: negative time');
    });

    it('should format milliseconds correctly', () => {
      expect(formatTimeGap(0)).toBe('0 milliseconds');
      expect(formatTimeGap(1)).toBe('1 millisecond');
      expect(formatTimeGap(500)).toBe('500 milliseconds');
    });

    it('should format seconds and minutes correctly', () => {
      expect(formatTimeGap(1000)).toBe('1 second');
      expect(formatTimeGap(2000)).toBe('2 seconds');
      expect(formatTimeGap(60000)).toBe('1 minute 0 seconds');
      expect(formatTimeGap(125000)).toBe('2 minutes 5 seconds');
    });

    it('should format hours and days correctly', () => {
      expect(formatTimeGap(3600000)).toBe('1 hour 0 minutes');
      expect(formatTimeGap(7380000)).toBe('2 hours 3 minutes');
      expect(formatTimeGap(86400000)).toBe('1 day 0 hours');
      expect(formatTimeGap(176400000)).toBe('2 days 1 hour');
    });

    it('should show only the two largest time units', () => {
      // Should not show milliseconds when seconds are present
      expect(formatTimeGap(1500)).toBe('1 second');
      // Should not show seconds when minutes are present
      expect(formatTimeGap(61000)).toBe('1 minute 1 second');
      // Should not show minutes when hours are present
      expect(formatTimeGap(3661000)).toBe('1 hour 1 minute');
    });
  });

  describe('getTimeGapFromDates', () => {
    it('should calculate time gap between dates correctly', () => {
      const startDate = moment('2023-01-01T00:00:00Z');
      const endDate = moment('2023-01-01T00:00:01Z');

      expect(getTimeGapFromDates(startDate, endDate)).toBe('1 second');
    });

    it('should handle same dates and reverse order', () => {
      const date = moment('2023-01-01T00:00:00Z');

      // Same dates should return 0 milliseconds
      expect(getTimeGapFromDates(date, date)).toBe('0 milliseconds');

      // Reverse order should return negative time error
      const startDate = moment('2023-01-01T00:00:01Z');
      const endDate = moment('2023-01-01T00:00:00Z');
      expect(getTimeGapFromDates(startDate, endDate)).toBe('Invalid input: negative time');
    });

    it('should handle various time intervals', () => {
      const startDate = moment('2023-01-01T00:00:00Z');

      // Minutes
      const endDate1 = moment('2023-01-01T00:15:30Z');
      expect(getTimeGapFromDates(startDate, endDate1)).toBe('15 minutes 30 seconds');

      // Hours
      const endDate2 = moment('2023-01-01T02:30:00Z');
      expect(getTimeGapFromDates(startDate, endDate2)).toBe('2 hours 30 minutes');

      // Days
      const endDate3 = moment('2023-01-03T05:00:00Z');
      expect(getTimeGapFromDates(startDate, endDate3)).toBe('2 days 5 hours');
    });

    it('should handle different date formats and sources', () => {
      const startDate = moment(new Date('2023-01-01T00:00:00Z'));
      const endDate = moment('2023-01-01T01:00:00Z');

      expect(getTimeGapFromDates(startDate, endDate)).toBe('1 hour 0 minutes');

      // Different format
      const startDate2 = moment('2023-01-01', 'YYYY-MM-DD');
      const endDate2 = moment('01/02/2023', 'MM/DD/YYYY');
      expect(getTimeGapFromDates(startDate2, endDate2)).toBe('1 day 0 hours');
    });

    it('should integrate properly with formatTimeGap', () => {
      const startDate = moment('2023-01-01T00:00:00Z');
      const endDate = moment('2023-01-01T01:30:45Z');

      const duration = moment.duration(moment(endDate).diff(moment(startDate)));
      const directResult = formatTimeGap(duration.asMilliseconds());
      const functionResult = getTimeGapFromDates(startDate, endDate);

      expect(functionResult).toBe(directResult);
      expect(functionResult).toBe('1 hour 30 minutes');
    });
  });

  describe('formatTimeRangeString', () => {
    it('should return empty strings when unixTimeRange is undefined', () => {
      const result = formatTimeRangeString(undefined);
      expect(result).toEqual({ from: '', to: '' });
    });

    it('should format unix timestamps with default date format', () => {
      const unixTimeRange = {
        selectionFrom: 1672531200000, // 2023-01-01 00:00:00.000
        selectionTo: 1672617600000, // 2023-01-02 00:00:00.000
      };
      const result = formatTimeRangeString(unixTimeRange);
      expect(result.from).toBe('2023-01-01 00:00:00.000');
      expect(result.to).toBe('2023-01-02 00:00:00.000');
    });

    it('should format unix timestamps with custom date format', () => {
      const unixTimeRange = {
        selectionFrom: 1672531200000,
        selectionTo: 1672617600000,
      };
      const customFormat = 'YYYY-MM-DD';
      const result = formatTimeRangeString(unixTimeRange, customFormat);
      expect(result.from).toBe('2023-01-01');
      expect(result.to).toBe('2023-01-02');
    });
  });
});
