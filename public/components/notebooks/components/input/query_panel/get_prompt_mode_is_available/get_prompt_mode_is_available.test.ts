/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPromptModeIsAvailable } from './get_prompt_mode_is_available';
import { NoteBookServices } from 'public/types';

describe('getPromptModeIsAvailable', () => {
  let services: jest.Mocked<NoteBookServices>;
  const dataSourceId = 'test-datasource';

  beforeEach(() => {
    services = {
      http: {
        post: jest.fn(),
      },
      uiSettings: {
        get: jest.fn() as jest.MockedFunction<any>,
      },
    } as any;

    jest.clearAllMocks();
  });

  it('returns false if AI features are disabled', async () => {
    (services.uiSettings.get as jest.Mock).mockReturnValue(false);

    const result = await getPromptModeIsAvailable(services, dataSourceId);
    expect(result).toBe(false);
    expect(services.uiSettings.get).toHaveBeenCalledWith('enableAIFeatures');
    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('returns false if ML config has no agent_id', async () => {
    (services.uiSettings.get as jest.Mock).mockReturnValue(true);
    (services.http.post as jest.Mock).mockResolvedValue({ configuration: {} });

    const result = await getPromptModeIsAvailable(services, dataSourceId);
    expect(result).toBe(false);
    expect(services.http.post).toHaveBeenCalledWith('/api/console/proxy', {
      query: {
        path: '/_plugins/_ml/config/os_query_assist_ppl',
        method: 'GET',
        dataSourceId,
      },
    });
  });

  it('returns true if ML config has agent_id', async () => {
    (services.uiSettings.get as jest.Mock).mockReturnValue(true);
    (services.http.post as jest.Mock).mockResolvedValue({
      configuration: { agent_id: 'test-agent' },
    });

    const result = await getPromptModeIsAvailable(services, dataSourceId);
    expect(result).toBe(true);
  });

  it('returns false if HTTP request throws an error', async () => {
    (services.uiSettings.get as jest.Mock).mockReturnValue(true);
    (services.http.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await getPromptModeIsAvailable(services, dataSourceId);
    expect(result).toBe(false);
  });

  it('works with undefined dataSourceId', async () => {
    (services.uiSettings.get as jest.Mock).mockReturnValue(true);
    (services.http.post as jest.Mock).mockResolvedValue({
      configuration: { agent_id: 'test-agent' },
    });

    const result = await getPromptModeIsAvailable(services, undefined);
    expect(result).toBe(true);
    expect(services.http.post).toHaveBeenCalledWith('/api/console/proxy', {
      query: {
        path: '/_plugins/_ml/config/os_query_assist_ppl',
        method: 'GET',
        dataSourceId: undefined,
      },
    });
  });
});
