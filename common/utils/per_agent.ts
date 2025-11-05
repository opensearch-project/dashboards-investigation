/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PERAgentHypothesisFinding,
  PERAgentHypothesisItem,
  PERAgentInvestigationResponse,
} from '../types/notebooks';

export const isValidPERAgentHypothesisFinding = (
  test: unknown
): test is PERAgentHypothesisFinding => {
  const data = test as Partial<PERAgentHypothesisFinding>;
  return (
    typeof data.id === 'string' &&
    typeof data.description === 'string' &&
    typeof data.evidence === 'string' &&
    typeof data.importance === 'number'
  );
};

export const isValidPERAgentHypothesisItem = (test: unknown): test is PERAgentHypothesisItem => {
  const data = test as Partial<PERAgentHypothesisItem>;
  return (
    typeof data.id === 'string' &&
    typeof data.description === 'string' &&
    typeof data.likelihood === 'number' &&
    Array.isArray(data.supporting_findings)
  );
};

export const isValidPERAgentInvestigationResponse = (
  test: unknown
): test is PERAgentInvestigationResponse => {
  const data = test as Partial<PERAgentInvestigationResponse>;
  return (
    Array.isArray(data.findings) &&
    data.findings.every(isValidPERAgentHypothesisFinding) &&
    Array.isArray(data.hypotheses) &&
    data.hypotheses.every(isValidPERAgentHypothesisItem)
  );
};
