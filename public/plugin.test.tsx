/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { createInvestigationAction } from './chat/actions/create_investigation_action';
import { registerInvestigateCommand } from './chat/command/investigate_command';
import { coreStartMock } from '../test/__mocks__/coreMocks';

/**
 * Tests the create_investigation tool disable/enable logic based on currentAppId$.
 * This mirrors the subscription in InvestigationPlugin.start().
 */
describe('create_investigation tool page-based availability', () => {
  let currentAppId$: BehaviorSubject<string | undefined>;
  let registerAssistantAction: jest.Mock;
  let subscription: Subscription;

  beforeEach(() => {
    currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    registerAssistantAction = jest.fn();
  });

  afterEach(() => {
    subscription?.unsubscribe();
  });

  const setupSubscription = () => {
    const investigationAction = createInvestigationAction(coreStartMock);
    registerAssistantAction(investigationAction);

    subscription = currentAppId$.subscribe((appId) => {
      if (appId === 'searchRelevance') {
        registerAssistantAction({ ...investigationAction, available: 'disabled' });
      } else {
        registerAssistantAction(investigationAction);
      }
    });

    return investigationAction;
  };

  it('should register the action initially', () => {
    setupSubscription();

    expect(registerAssistantAction).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'create_investigation' })
    );
  });

  it('should disable create_investigation when appId is searchRelevance', () => {
    setupSubscription();
    registerAssistantAction.mockClear();

    currentAppId$.next('searchRelevance');

    expect(registerAssistantAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'create_investigation',
        available: 'disabled',
      })
    );
  });

  it('should enable create_investigation when navigating away from searchRelevance', () => {
    setupSubscription();
    currentAppId$.next('searchRelevance');
    registerAssistantAction.mockClear();

    currentAppId$.next('explore');

    expect(registerAssistantAction).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'create_investigation' })
    );
    expect(registerAssistantAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ available: 'disabled' })
    );
  });

  it('should not fire after unsubscribe', () => {
    setupSubscription();
    subscription.unsubscribe();
    registerAssistantAction.mockClear();

    currentAppId$.next('searchRelevance');

    expect(registerAssistantAction).not.toHaveBeenCalled();
  });
});

describe('/investigate command page-based availability', () => {
  let currentAppId$: BehaviorSubject<string | undefined>;
  let mockRegisterCommand: jest.Mock;
  let mockUnregister: jest.Mock;
  let chatSetup: any;
  let unregisterCommand: (() => void) | undefined;
  let subscription: Subscription;

  beforeEach(() => {
    currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    mockUnregister = jest.fn();
    mockRegisterCommand = jest.fn().mockReturnValue(mockUnregister);
    chatSetup = { commandRegistry: { registerCommand: mockRegisterCommand } };
    unregisterCommand = registerInvestigateCommand(chatSetup);
  });

  afterEach(() => {
    subscription?.unsubscribe();
  });

  const setupSubscription = () => {
    subscription = currentAppId$.subscribe((appId) => {
      if (appId === 'searchRelevance') {
        if (unregisterCommand) {
          unregisterCommand();
          unregisterCommand = undefined;
        }
      } else {
        if (!unregisterCommand) {
          unregisterCommand = registerInvestigateCommand(chatSetup);
        }
      }
    });
  };

  it('should unregister /investigate command on searchRelevance page', () => {
    setupSubscription();

    currentAppId$.next('searchRelevance');

    expect(mockUnregister).toHaveBeenCalled();
    expect(unregisterCommand).toBeUndefined();
  });

  it('should re-register /investigate command when leaving searchRelevance', () => {
    setupSubscription();
    currentAppId$.next('searchRelevance');
    mockRegisterCommand.mockClear();

    currentAppId$.next('explore');

    expect(mockRegisterCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'investigate' })
    );
    expect(unregisterCommand).toBeDefined();
  });

  it('should not re-register if already registered', () => {
    setupSubscription();
    mockRegisterCommand.mockClear();

    currentAppId$.next('explore');

    expect(mockRegisterCommand).not.toHaveBeenCalled();
  });

  it('should not unregister if already unregistered', () => {
    setupSubscription();
    currentAppId$.next('searchRelevance');
    mockUnregister.mockClear();

    currentAppId$.next('searchRelevance');

    expect(mockUnregister).not.toHaveBeenCalled();
  });
});
