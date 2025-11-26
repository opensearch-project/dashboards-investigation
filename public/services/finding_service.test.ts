/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { FindingService, FindingCallback } from './finding_service';

describe('FindingService', () => {
  let service: FindingService;

  beforeEach(() => {
    service = new FindingService();
  });

  afterEach(() => {
    service.clearFindings();
  });

  describe('initialize', () => {
    it('should set notebook id', () => {
      service.initialize('notebook-123');
      expect(service.currentNotebookId).toBe('notebook-123');
    });
  });

  describe('addFinding', () => {
    it('should add a finding with all required fields', async () => {
      const input = 'test input';
      const output = 'test output';
      const finding = await service.addFinding(input, output);

      expect(finding).toBeDefined();
      expect(finding.id).toBeDefined();
      expect(finding.input).toBe(input);
      expect(finding.output).toBe(output);
      expect(finding.timestamp).toBeDefined();
      expect(finding.markdown).toContain(input);
      expect(finding.markdown).toContain(output);
    });

    it('should add finding with notebook id', async () => {
      const notebookId = 'notebook-456';
      const finding = await service.addFinding('input', 'output', notebookId);

      expect(finding.notebookId).toBe(notebookId);
    });

    it('should generate markdown content', async () => {
      const input = 'analyze logs';
      const output = 'found 5 errors';
      const finding = await service.addFinding(input, output);

      expect(finding.markdown).toContain('## Investigation Finding');
      expect(finding.markdown).toContain(`**Input:** ${input}`);
      expect(finding.markdown).toContain(`**Output:** ${output}`);
      expect(finding.markdown).toContain('**Timestamp:**');
    });

    it('should store finding in service', async () => {
      const finding = await service.addFinding('input', 'output');
      const retrieved = service.getFinding(finding.id);

      expect(retrieved).toEqual(finding);
    });

    it('should invoke callbacks after adding finding', async () => {
      const callback = jest.fn();
      service.registerCallback('onFindingAdded', callback);

      const finding = await service.addFinding('input', 'output', 'notebook-789');

      expect(callback).toHaveBeenCalledWith(finding, 'notebook-789');
    });

    it('should use current notebook id if not provided', async () => {
      const callback = jest.fn();
      service.initialize('current-notebook');
      service.registerCallback('onFindingAdded', callback);

      const finding = await service.addFinding('input', 'output');

      expect(callback).toHaveBeenCalledWith(finding, 'current-notebook');
    });
  });

  describe('getFindings', () => {
    it('should return empty array initially', () => {
      expect(service.getFindings()).toEqual([]);
    });

    it('should return all findings', async () => {
      await service.addFinding('input1', 'output1');
      await service.addFinding('input2', 'output2');
      await service.addFinding('input3', 'output3');

      const findings = service.getFindings();
      expect(findings).toHaveLength(3);
    });

    it('should return findings sorted by timestamp descending', async () => {
      const finding1 = await service.addFinding('first', 'output1');
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const finding2 = await service.addFinding('second', 'output2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const finding3 = await service.addFinding('third', 'output3');

      const findings = service.getFindings();
      expect(findings[0].id).toBe(finding3.id);
      expect(findings[1].id).toBe(finding2.id);
      expect(findings[2].id).toBe(finding1.id);
    });
  });

  describe('getFinding', () => {
    it('should return undefined for non-existent id', () => {
      expect(service.getFinding('non-existent')).toBeUndefined();
    });

    it('should return finding by id', async () => {
      const finding = await service.addFinding('input', 'output');
      const retrieved = service.getFinding(finding.id);

      expect(retrieved).toEqual(finding);
    });
  });

  describe('clearFindings', () => {
    it('should remove all findings', async () => {
      await service.addFinding('input1', 'output1');
      await service.addFinding('input2', 'output2');

      service.clearFindings();

      expect(service.getFindings()).toEqual([]);
    });
  });

  describe('registerCallback', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = service.registerCallback('onFindingAdded', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should throw error if callback is not a function', () => {
      expect(() => {
        service.registerCallback('onFindingAdded', 'not a function' as any);
      }).toThrow('Callback must be a function');
    });

    it('should allow multiple callbacks for same event', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.registerCallback('onFindingAdded', callback1);
      service.registerCallback('onFindingAdded', callback2);

      await service.addFinding('input', 'output');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe callback', async () => {
      const callback = jest.fn();
      const unsubscribe = service.registerCallback('onFindingAdded', callback);

      unsubscribe();

      await service.addFinding('input', 'output');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle async callbacks', async () => {
      const asyncCallback: FindingCallback = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      service.registerCallback('onFindingAdded', asyncCallback);

      await service.addFinding('input', 'output');

      expect(asyncCallback).toHaveBeenCalled();
    });

    it('should continue execution if callback throws error', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();

      service.registerCallback('onFindingAdded', errorCallback);
      service.registerCallback('onFindingAdded', successCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.addFinding('input', 'output');

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle async callback errors', async () => {
      const errorCallback = jest.fn(async () => {
        throw new Error('Async error');
      });
      const successCallback = jest.fn();

      service.registerCallback('onFindingAdded', errorCallback);
      service.registerCallback('onFindingAdded', successCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.addFinding('input', 'output');

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('currentNotebookId', () => {
    it('should return undefined initially', () => {
      expect(service.currentNotebookId).toBeUndefined();
    });

    it('should return current notebook id after initialization', () => {
      service.initialize('test-notebook');
      expect(service.currentNotebookId).toBe('test-notebook');
    });
  });
});
