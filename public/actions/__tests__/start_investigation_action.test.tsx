/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StartInvestigationAction,
  ACTION_START_INVESTIGATION,
} from '../start_investigation_action';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { OverlayStart } from '../../../../../src/core/public';
import { StartInvestigateModalDedentServices } from '../../components/notebooks/components/discover_explorer/start_investigation_modal';

// Mock dependencies
jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  toMountPoint: jest.fn((component) => component),
}));

import { toMountPoint } from '../../../../../src/plugins/opensearch_dashboards_react/public';

const mockToMountPoint = toMountPoint as jest.MockedFunction<typeof toMountPoint>;

describe('StartInvestigationAction', () => {
  let mockOverlay: jest.Mocked<OverlayStart>;
  let mockServices: StartInvestigateModalDedentServices;
  let action: StartInvestigationAction;
  let mockEmbeddable: IEmbeddable;
  let mockOverlayRef: { close: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock overlay
    mockOverlayRef = { close: jest.fn() };
    mockOverlay = {
      openModal: jest.fn().mockReturnValue(mockOverlayRef),
    } as any;

    // Setup mock services
    mockServices = {
      data: {} as any,
      http: {} as any,
      application: {} as any,
      notifications: {} as any,
    };

    // Setup mock embeddable
    mockEmbeddable = {
      type: 'explore',
      getInput: jest.fn(),
      getOutput: jest.fn(),
      reload: jest.fn(),
      destroy: jest.fn(),
    } as any;

    action = new StartInvestigationAction(mockOverlay, mockServices);
  });

  describe('constructor', () => {
    it('should initialize with correct type and id', () => {
      expect(action.type).toBe(ACTION_START_INVESTIGATION);
      expect(action.id).toBe(ACTION_START_INVESTIGATION);
    });

    it('should set correct order for menu positioning', () => {
      expect(action.order).toBe(25);
    });
  });

  describe('getDisplayName', () => {
    it('should return translated display name', () => {
      const displayName = action.getDisplayName();
      expect(displayName).toBe('Start investigation');
    });
  });

  describe('getIconType', () => {
    it('should return notebookApp icon', () => {
      const iconType = action.getIconType();
      expect(iconType).toBe('notebookApp');
    });
  });

  describe('isCompatible', () => {
    it('should return true for explore type embeddables', async () => {
      const embeddable = { type: 'explore' } as IEmbeddable;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(true);
    });

    it('should return false for non-explore type embeddables', async () => {
      const embeddable = { type: 'visualization' } as IEmbeddable;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });

    it('should return false for dashboard type embeddables', async () => {
      const embeddable = { type: 'dashboard' } as IEmbeddable;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });

    it('should return false for lens type embeddables', async () => {
      const embeddable = { type: 'lens' } as IEmbeddable;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });

    it('should return false for undefined type', async () => {
      const embeddable = { type: undefined } as any;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });

    it('should return false for null type', async () => {
      const embeddable = { type: null } as any;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });

    it('should return false for empty string type', async () => {
      const embeddable = { type: '' } as any;
      const result = await action.isCompatible({ embeddable });
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should open modal with correct component', async () => {
      await action.execute({ embeddable: mockEmbeddable });

      expect(mockOverlay.openModal).toHaveBeenCalledTimes(1);
      expect(mockOverlay.openModal).toHaveBeenCalledWith(expect.any(Object), {
        'data-test-subj': 'startInvestigationModal',
      });
    });

    it('should pass embeddable to component', async () => {
      await action.execute({ embeddable: mockEmbeddable });

      expect(mockToMountPoint).toHaveBeenCalledTimes(1);
      const componentProps = mockToMountPoint.mock.calls[0][0].props;
      expect(componentProps.embeddable).toBe(mockEmbeddable);
    });

    it('should pass services to component', async () => {
      await action.execute({ embeddable: mockEmbeddable });

      const componentProps = mockToMountPoint.mock.calls[0][0].props;
      expect(componentProps.services).toBe(mockServices);
    });

    it('should provide onClose callback that closes modal', async () => {
      await action.execute({ embeddable: mockEmbeddable });

      const componentProps = mockToMountPoint.mock.calls[0][0].props;
      expect(componentProps.onClose).toBeDefined();
      expect(typeof componentProps.onClose).toBe('function');

      // Call onClose and verify it closes the modal
      componentProps.onClose();
      expect(mockOverlayRef.close).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple executions', async () => {
      await action.execute({ embeddable: mockEmbeddable });
      await action.execute({ embeddable: mockEmbeddable });
      await action.execute({ embeddable: mockEmbeddable });

      expect(mockOverlay.openModal).toHaveBeenCalledTimes(3);
    });

    it('should create new overlay ref for each execution', async () => {
      const firstOverlayRef = { close: jest.fn() };
      const secondOverlayRef = { close: jest.fn() };

      mockOverlay.openModal = jest
        .fn()
        .mockReturnValueOnce(firstOverlayRef)
        .mockReturnValueOnce(secondOverlayRef);

      await action.execute({ embeddable: mockEmbeddable });
      await action.execute({ embeddable: mockEmbeddable });

      expect(mockOverlay.openModal).toHaveBeenCalledTimes(2);
    });

    it('should pass correct data-test-subj attribute', async () => {
      await action.execute({ embeddable: mockEmbeddable });

      const modalOptions = mockOverlay.openModal.mock.calls[0][1];
      expect(modalOptions).toEqual({
        'data-test-subj': 'startInvestigationModal',
      });
    });

    it('should work with different embeddable instances', async () => {
      const embeddable1 = { type: 'explore', id: '1' } as any;
      const embeddable2 = { type: 'explore', id: '2' } as any;

      await action.execute({ embeddable: embeddable1 });
      await action.execute({ embeddable: embeddable2 });

      expect(mockOverlay.openModal).toHaveBeenCalledTimes(2);
    });
  });

  describe('integration', () => {
    it('should work with complete action lifecycle', async () => {
      // Check compatibility
      const isCompatible = await action.isCompatible({ embeddable: mockEmbeddable });
      expect(isCompatible).toBe(true);

      // Execute action
      await action.execute({ embeddable: mockEmbeddable });
      expect(mockOverlay.openModal).toHaveBeenCalled();

      // Get display name
      const displayName = action.getDisplayName();
      expect(displayName).toBe('Start investigation');

      // Get icon
      const icon = action.getIconType();
      expect(icon).toBe('notebookApp');
    });

    it('should not execute for incompatible embeddables', async () => {
      const incompatibleEmbeddable = { type: 'visualization' } as IEmbeddable;
      const isCompatible = await action.isCompatible({ embeddable: incompatibleEmbeddable });
      expect(isCompatible).toBe(false);

      // In real usage, execute would not be called for incompatible embeddables
      // but we can still test that it would open a modal if called
      await action.execute({ embeddable: incompatibleEmbeddable });
      expect(mockOverlay.openModal).toHaveBeenCalled();
    });
  });

  describe('action properties', () => {
    it('should have correct type property', () => {
      expect(action.type).toBe(ACTION_START_INVESTIGATION);
    });

    it('should have correct id property', () => {
      expect(action.id).toBe(ACTION_START_INVESTIGATION);
    });

    it('should have mutable order property', () => {
      expect(action.order).toBe(25);
      action.order = 30;
      expect(action.order).toBe(30);
    });
  });

  describe('error handling', () => {
    it('should handle overlay.openModal throwing error', async () => {
      mockOverlay.openModal = jest.fn().mockImplementation(() => {
        throw new Error('Modal error');
      });

      await expect(action.execute({ embeddable: mockEmbeddable })).rejects.toThrow('Modal error');
    });
  });

  describe('constants', () => {
    it('should export ACTION_START_INVESTIGATION constant', () => {
      expect(ACTION_START_INVESTIGATION).toBe('startInvestigationAction');
    });

    it('should use consistent action identifier', () => {
      expect(action.type).toBe(ACTION_START_INVESTIGATION);
      expect(action.id).toBe(ACTION_START_INVESTIGATION);
    });
  });
});
