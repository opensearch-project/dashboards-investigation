/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  createInvestigationAction,
  CreateInvestigationRequest,
} from '../create_investigation_action';
import { coreStartMock } from '../../../../test/__mocks__/coreMocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';

describe('createInvestigationAction', () => {
  const mockHttp = coreStartMock.http;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('action configuration', () => {
    it('returns correct action configuration', () => {
      const action = createInvestigationAction(coreStartMock);

      expect(action.name).toBe('create_investigation');
      expect(action.description).toContain('Create a new agentic investigation notebook');
      expect(action.requiresConfirmation).toBe(true);
      expect(action.enabled).toBe(true);
      expect(action.useCustomRenderer).toBe(true);
    });

    it('has correct parameter schema', () => {
      const action = createInvestigationAction(coreStartMock);

      expect(action.parameters.type).toBe('object');
      expect(action.parameters.required).toEqual(['name', 'initialGoal', 'symptom', 'index']);
      expect(action.parameters.properties).toHaveProperty('name');
      expect(action.parameters.properties).toHaveProperty('initialGoal');
      expect(action.parameters.properties).toHaveProperty('symptom');
      expect(action.parameters.properties).toHaveProperty('index');
      expect(action.parameters.properties).toHaveProperty('timeRange');
      expect(action.parameters.properties).toHaveProperty('baseline');
    });
  });

  describe('handler', () => {
    const mockArgs: CreateInvestigationRequest = {
      name: 'Test Investigation',
      initialGoal: 'Find root cause of errors',
      symptom: 'High error rate in production',
      index: 'logs-*',
    };

    it('creates investigation successfully with minimal args', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler?.(mockArgs);

      expect(result.success).toBe(true);
      expect(result.notebookId).toBe('test-notebook-id');
      expect(result.name).toBe('Test Investigation');
      expect(mockHttp.post).toHaveBeenCalledWith(
        `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
        expect.objectContaining({
          body: expect.any(String),
        })
      );
    });

    it('creates investigation with time range', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const argsWithTimeRange = {
        ...mockArgs,
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler?.(argsWithTimeRange);

      expect(result.success).toBe(true);
      expect(result.timeRange).toEqual(argsWithTimeRange.timeRange);

      const callBody = JSON.parse(mockHttp.post.mock.calls[0][1].body);
      expect(callBody.context.timeRange).toBeDefined();
      expect(callBody.context.timeRange.selectionFrom).toBeDefined();
      expect(callBody.context.timeRange.selectionTo).toBeDefined();
    });

    it('creates investigation with baseline time range', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const argsWithBaseline = {
        ...mockArgs,
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        baseline: {
          from: 'now-30m',
          to: 'now-15m',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithBaseline);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockHttp.post.mock.calls[0][1].body);
      expect(callBody.context.timeRange.baselineFrom).toBeDefined();
      expect(callBody.context.timeRange.baselineTo).toBeDefined();
    });

    it('creates investigation with queries', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const argsWithQueries = {
        ...mockArgs,
        dslQuery: '{"query": {"match_all": {}}}',
        pplQuery: 'source=logs-* | stats count()',
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithQueries);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockHttp.post.mock.calls[0][1].body);
      expect(callBody.context.variables.dslQuery).toBe(argsWithQueries.dslQuery);
      expect(callBody.context.variables.pplQuery).toBe(argsWithQueries.pplQuery);
    });

    it('handles empty initial goal', async () => {
      const argsWithEmptyGoal = {
        ...mockArgs,
        initialGoal: '',
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithEmptyGoal);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Investigation goal cannot be empty');
    });

    it('handles invalid time range format', async () => {
      const argsWithInvalidTime = {
        ...mockArgs,
        timeRange: {
          from: 'invalid-date',
          to: 'invalid-date',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithInvalidTime);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid time range format');
    });

    it('handles time range where from is after to', async () => {
      const argsWithInvalidRange = {
        ...mockArgs,
        timeRange: {
          from: 'now',
          to: 'now-15m',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithInvalidRange);

      expect(result.success).toBe(false);
      expect(result.error).toContain('start time');
      expect(result.error).toContain('after end time');
    });

    it('handles invalid baseline time range', async () => {
      const argsWithInvalidBaseline = {
        ...mockArgs,
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        baseline: {
          from: 'invalid',
          to: 'invalid',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithInvalidBaseline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid baseline time range format');
    });

    it('handles API error', async () => {
      mockHttp.post = jest.fn().mockRejectedValue(new Error('Network error'));

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler?.(mockArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles empty notebook ID response', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('');

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(mockArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create investigation notebook');
    });

    it('includes success message in response', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(mockArgs);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Investigation created successfully');
    });

    it('handles absolute ISO-8601 time format', async () => {
      mockHttp.post = jest.fn().mockResolvedValue('test-notebook-id');

      const argsWithAbsoluteTime = {
        ...mockArgs,
        timeRange: {
          from: '2025-01-01T00:00:00Z',
          to: '2025-01-01T23:59:59Z',
        },
      };

      const action = createInvestigationAction(coreStartMock);
      const result = await action.handler(argsWithAbsoluteTime);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockHttp.post.mock.calls[0][1].body);
      expect(callBody.context.timeRange.selectionFrom).toBeDefined();
      expect(callBody.context.timeRange.selectionTo).toBeDefined();
    });
  });

  describe('render', () => {
    it('renders custom component', () => {
      const action = createInvestigationAction(coreStartMock);

      const { container } = render(
        <>
          {action.render?.({
            status: 'executing',
            args: {
              name: 'Test',
              initialGoal: 'Goal',
              symptom: 'Symptom',
              index: 'logs-*',
            },
          })}
        </>
      );

      expect(container).toHaveTextContent('Confirm investigation details');
    });
  });
});
