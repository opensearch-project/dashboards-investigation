/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  uiSettingsService,
  getOSDHttp,
  setOSDHttp,
  getOSDSavedObjectsClient,
  setOSDSavedObjectsClient,
} from './core_services';
import {
  IUiSettingsClient,
  NotificationsStart,
  HttpStart,
  SavedObjectsClientContract,
} from '../../../../src/core/public';

describe('core_services', () => {
  describe('uiSettingsService', () => {
    let mockUiSettings: jest.Mocked<IUiSettingsClient>;
    let mockNotifications: jest.Mocked<NotificationsStart>;

    beforeEach(() => {
      mockUiSettings = {
        get: jest.fn(),
        set: jest.fn(),
      } as any;

      mockNotifications = {
        toasts: {
          add: jest.fn(),
        },
      } as any;
    });

    describe('init', () => {
      it('should initialize uiSettings and notifications', () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);

        // Verify by calling get/set/addToast
        mockUiSettings.get.mockReturnValue('test-value');
        expect(uiSettingsService.get('test-key')).toBe('test-value');
      });
    });

    describe('get', () => {
      it('should get value from uiSettings', () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);
        mockUiSettings.get.mockReturnValue('test-value');

        const result = uiSettingsService.get('test-key');

        expect(mockUiSettings.get).toHaveBeenCalledWith('test-key', undefined);
        expect(result).toBe('test-value');
      });

      it('should get value with default override', () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);
        mockUiSettings.get.mockReturnValue('test-value');

        const result = uiSettingsService.get('test-key', 'default-value');

        expect(mockUiSettings.get).toHaveBeenCalledWith('test-key', 'default-value');
        expect(result).toBe('test-value');
      });

      it('should handle when uiSettings returns falsy value', () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);
        mockUiSettings.get.mockReturnValue(null);

        const result = uiSettingsService.get('test-key');

        expect(result).toBe('');
      });
    });

    describe('set', () => {
      it('should set value in uiSettings', async () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);
        mockUiSettings.set.mockResolvedValue(true);

        await uiSettingsService.set('test-key', 'test-value');

        expect(mockUiSettings.set).toHaveBeenCalledWith('test-key', 'test-value');
      });
    });

    describe('addToast', () => {
      it('should add toast notification', () => {
        uiSettingsService.init(mockUiSettings, mockNotifications);
        const toast = { title: 'Test Toast' };

        uiSettingsService.addToast(toast);

        expect(mockNotifications.toasts.add).toHaveBeenCalledWith(toast);
      });
    });
  });

  describe('OSD HTTP getter/setter', () => {
    it('should set and get OSD HTTP client', () => {
      const mockHttp = {} as HttpStart;

      setOSDHttp(mockHttp);
      const result = getOSDHttp();

      expect(result).toBe(mockHttp);
    });
  });

  describe('OSD SavedObjectsClient getter/setter', () => {
    it('should set and get SavedObjectsClient', () => {
      const mockClient = {} as SavedObjectsClientContract;

      setOSDSavedObjectsClient(mockClient);
      const result = getOSDSavedObjectsClient();

      expect(result).toBe(mockClient);
    });
  });
});
