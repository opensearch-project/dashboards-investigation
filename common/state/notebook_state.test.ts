/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvestigationPhase, isInvestigationActive } from './notebook_state';

describe('InvestigationPhase', () => {
  it('should have correct enum values', () => {
    expect(InvestigationPhase.PLANNING).toBe('planning');
    expect(InvestigationPhase.RETRIEVING_CONTEXT).toBe('retrieving_context');
    expect(InvestigationPhase.GATHERING_DATA).toBe('gathering_data');
    expect(InvestigationPhase.COMPLETED).toBe('completed');
  });

  it('should have all expected phases', () => {
    const phases = Object.values(InvestigationPhase);
    expect(phases).toHaveLength(4);
    expect(phases).toContain('planning');
    expect(phases).toContain('retrieving_context');
    expect(phases).toContain('gathering_data');
    expect(phases).toContain('completed');
  });
});

describe('isInvestigationActive', () => {
  it('should return true for PLANNING phase', () => {
    expect(isInvestigationActive(InvestigationPhase.PLANNING)).toBe(true);
  });

  it('should return true for RETRIEVING_CONTEXT phase', () => {
    expect(isInvestigationActive(InvestigationPhase.RETRIEVING_CONTEXT)).toBe(true);
  });

  it('should return true for GATHERING_DATA phase', () => {
    expect(isInvestigationActive(InvestigationPhase.GATHERING_DATA)).toBe(true);
  });

  it('should return false for COMPLETED phase', () => {
    expect(isInvestigationActive(InvestigationPhase.COMPLETED)).toBe(false);
  });

  it('should return false for undefined phase', () => {
    expect(isInvestigationActive(undefined)).toBe(false);
  });

  it('should return false for null phase', () => {
    expect(isInvestigationActive(null as any)).toBe(false);
  });

  it('should return false for invalid phase value', () => {
    expect(isInvestigationActive('invalid' as any)).toBe(false);
  });

  it('should handle all active phases correctly', () => {
    const activePhases = [
      InvestigationPhase.PLANNING,
      InvestigationPhase.RETRIEVING_CONTEXT,
      InvestigationPhase.GATHERING_DATA,
    ];

    activePhases.forEach((phase) => {
      expect(isInvestigationActive(phase)).toBe(true);
    });
  });

  it('should handle all inactive phases correctly', () => {
    const inactivePhases = [InvestigationPhase.COMPLETED, undefined];

    inactivePhases.forEach((phase) => {
      expect(isInvestigationActive(phase)).toBe(false);
    });
  });
});
