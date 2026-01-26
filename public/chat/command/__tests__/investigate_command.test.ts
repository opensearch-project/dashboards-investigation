/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerInvestigateCommand } from '../investigate_command';
import { ChatPluginSetup } from '../../../../../../src/plugins/chat/public';

describe('registerInvestigateCommand', () => {
  let mockRegisterCommand: jest.Mock;
  let mockChatSetup: ChatPluginSetup;

  beforeEach(() => {
    mockRegisterCommand = jest.fn();
    mockChatSetup = {
      commandRegistry: {
        registerCommand: mockRegisterCommand,
      },
      suggestedActionsService: {} as unknown,
    } as ChatPluginSetup;
  });

  it('registers command with chat setup', () => {
    const mockUnregister = jest.fn();
    mockRegisterCommand.mockReturnValue(mockUnregister);

    const unregister = registerInvestigateCommand(mockChatSetup);

    expect(mockRegisterCommand).toHaveBeenCalledTimes(1);
    expect(unregister).toBeDefined();
    expect(unregister).toBe(mockUnregister);
  });

  it('registers command with correct configuration', () => {
    registerInvestigateCommand(mockChatSetup);

    const commandConfig = mockRegisterCommand.mock.calls[0][0];

    expect(commandConfig.command).toBe('investigate');
    expect(commandConfig.description).toBe('Ask investigation agent to find root cause');
    expect(commandConfig.usage).toBe('/investigate <description of what to investigate>');
    expect(commandConfig.hint).toBe('based on conversation, or enter a different goal.');
    expect(commandConfig.handler).toBeDefined();
  });

  it('returns unregister function from chat plugin', () => {
    const mockUnregister = jest.fn();
    mockRegisterCommand.mockReturnValue(mockUnregister);

    const unregister = registerInvestigateCommand(mockChatSetup);

    expect(unregister).toBe(mockUnregister);
  });

  describe('command handler', () => {
    it('returns prompt with user-specified goal when args provided', async () => {
      registerInvestigateCommand(mockChatSetup);

      const commandConfig = mockRegisterCommand.mock.calls[0][0];
      const handler = commandConfig.handler;

      const result = await handler('investigate login errors');

      expect(result).toContain(
        'I want to create a NEW investigation for: investigate login errors'
      );
      expect(result).toContain('completely new investigation');
      expect(result).toContain('separate from any previous investigations');
    });

    it('returns prompt to infer from conversation when no args provided', async () => {
      registerInvestigateCommand(mockChatSetup);

      const commandConfig = mockRegisterCommand.mock.calls[0][0];
      const handler = commandConfig.handler;

      const result = await handler('');

      expect(result).toContain('I want to create a NEW investigation based on our conversation');
      expect(result).toContain('current page context');
      expect(result).toContain('completely new investigation');
    });

    it('handles whitespace-only args as empty', async () => {
      registerInvestigateCommand(mockChatSetup);

      const commandConfig = mockRegisterCommand.mock.calls[0][0];
      const handler = commandConfig.handler;

      const result = await handler('   ');

      expect(result).toContain('based on our conversation');
      expect(result).not.toContain('I want to create a NEW investigation for:');
    });

    it('preserves full user input in prompt', async () => {
      registerInvestigateCommand(mockChatSetup);

      const commandConfig = mockRegisterCommand.mock.calls[0][0];
      const handler = commandConfig.handler;

      const userInput = 'high CPU usage in production servers between 2pm and 4pm';
      const result = await handler(userInput);

      expect(result).toContain(userInput);
    });
  });
});
