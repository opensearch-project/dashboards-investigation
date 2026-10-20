/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '../../../src/core/public/mocks';

// Mock all heavy transitive imports before importing plugin
jest.mock('../common/utils', () => ({
  uiSettingsService: { init: jest.fn() },
  setOSDHttp: jest.fn(),
  setOSDSavedObjectsClient: jest.fn(),
}));
jest.mock('./services', () => ({
  setClient: jest.fn(),
  setData: jest.fn(),
  setDataSourceManagementSetup: jest.fn(),
  setEmbeddable: jest.fn(),
  setExpressions: jest.fn(),
  setSearch: jest.fn(),
  setNotifications: jest.fn(),
  setVisualizations: jest.fn(),
  ParagraphService: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockReturnValue({ register: jest.fn() }),
  })),
  FindingService: jest.fn(),
}));
jest.mock('./services/context_service', () => ({
  ContextService: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockReturnValue({}),
  })),
}));
jest.mock('./paragraphs', () => ({
  paragraphRegistry: [],
}));
jest.mock('./plugin_helpers/plugin_nav', () => ({
  registerAllPluginNavGroups: jest.fn(),
}));
jest.mock(
  './components/notebooks/components/data_distribution/embeddable/data_distribution_embeddable_factory',
  () => ({
    DataDistributionEmbeddableFactory: jest.fn(),
  })
);
jest.mock('./components/notebooks/components/classic_notebook', () => ({
  ClassicNotebook: jest.fn(),
}));
jest.mock('./components/notebooks/components/discover_explorer', () => ({
  createInvestigateLogActionComponent: jest.fn(),
}));
jest.mock('./components/notebooks/components/discover_explorer/start_investigate_button', () => ({
  StartInvestigateButton: jest.fn(),
}));
jest.mock('./actions/start_investigation_action', () => ({
  StartInvestigationAction: jest.fn().mockImplementation(() => ({ id: 'mock-action' })),
}));
jest.mock('./utils/data_source_utils', () => ({
  isAnalyticEngineDataSource: jest.fn().mockReturnValue(false),
}));

// Now import the plugin
import { InvestigationPlugin } from './plugin';

describe('InvestigationPlugin page-based availability', () => {
  let plugin: InvestigationPlugin;
  let currentAppId$: BehaviorSubject<string | undefined>;
  let mockRegisterAssistantAction: jest.Mock;
  let mockRegisterCommand: jest.Mock;
  let mockUnregisterCommand: jest.Mock;

  beforeEach(() => {
    plugin = new InvestigationPlugin();
    currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    mockRegisterAssistantAction = jest.fn();
    mockUnregisterCommand = jest.fn();
    mockRegisterCommand = jest.fn().mockReturnValue(mockUnregisterCommand);
  });

  afterEach(() => {
    plugin.stop();
  });

  const setupAndStart = async () => {
    const coreSetup = coreMock.createSetup();
    const coreStartForSetup = coreMock.createStart();
    Object.defineProperty(coreStartForSetup.application, 'capabilities', {
      value: {
        ...coreStartForSetup.application.capabilities,
        investigation: { enabled: true, agenticFeaturesEnabled: true },
      },
      writable: true,
    });
    coreSetup.getStartServices.mockResolvedValue([coreStartForSetup, {} as any, {} as any]);

    const setupDeps = {
      embeddable: { registerEmbeddableFactory: jest.fn() } as any,
      visualizations: {} as any,
      data: { search: {} } as any,
      dataSource: {} as any,
      dataSourceManagement: undefined,
      chat: { commandRegistry: { registerCommand: mockRegisterCommand } },
    };

    await plugin.setup(coreSetup, setupDeps);

    const coreStart = coreMock.createStart();
    (coreStart.application as any).currentAppId$ = currentAppId$;
    Object.defineProperty(coreStart.application, 'capabilities', {
      value: {
        ...coreStart.application.capabilities,
        investigation: { enabled: true, agenticFeaturesEnabled: true },
      },
      writable: true,
    });
    (coreStart as any).telemetry = {
      getPluginRecorder: jest.fn().mockReturnValue({}),
    };

    const startDeps = {
      navigation: {} as any,
      embeddable: {} as any,
      dashboard: {} as any,
      savedObjectsClient: {} as any,
      data: { search: {} } as any,
      dataSource: {} as any,
      expressions: {} as any,
      visualizations: {} as any,
      uiActions: { registerAction: jest.fn(), attachAction: jest.fn() } as any,
      contextProvider: {
        actions: { registerAssistantAction: mockRegisterAssistantAction },
        getAssistantContextStore: jest.fn(),
      },
      explore: { slotRegistry: { register: jest.fn() } },
    };

    plugin.start(coreStart, startDeps as any);
  };

  describe('create_investigation tool', () => {
    it('should register the action on start', async () => {
      await setupAndStart();

      expect(mockRegisterAssistantAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'create_investigation' })
      );
    });

    it('should disable create_investigation when navigating to searchRelevance', async () => {
      await setupAndStart();
      mockRegisterAssistantAction.mockClear();

      currentAppId$.next('searchRelevance');

      expect(mockRegisterAssistantAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'create_investigation',
          available: 'disabled',
        })
      );
    });

    it('should re-enable create_investigation when navigating away from searchRelevance', async () => {
      await setupAndStart();
      currentAppId$.next('searchRelevance');
      mockRegisterAssistantAction.mockClear();

      currentAppId$.next('explore');

      expect(mockRegisterAssistantAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'create_investigation' })
      );
      expect(mockRegisterAssistantAction).not.toHaveBeenCalledWith(
        expect.objectContaining({ available: 'disabled' })
      );
    });
  });

  describe('/investigate command', () => {
    it('should register /investigate command during setup', async () => {
      await setupAndStart();

      expect(mockRegisterCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'investigate' })
      );
    });

    it('should unregister /investigate command on searchRelevance page', async () => {
      await setupAndStart();

      currentAppId$.next('searchRelevance');

      expect(mockUnregisterCommand).toHaveBeenCalled();
    });

    it('should re-register /investigate command when leaving searchRelevance', async () => {
      await setupAndStart();
      currentAppId$.next('searchRelevance');
      mockRegisterCommand.mockClear();

      currentAppId$.next('explore');

      expect(mockRegisterCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'investigate' })
      );
    });

    it('should not re-register if already registered', async () => {
      await setupAndStart();
      mockRegisterCommand.mockClear();

      currentAppId$.next('explore');

      expect(mockRegisterCommand).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe and unregister on stop', async () => {
      await setupAndStart();

      plugin.stop();
      mockRegisterAssistantAction.mockClear();

      currentAppId$.next('searchRelevance');
      expect(mockRegisterAssistantAction).not.toHaveBeenCalled();
    });
  });
});
