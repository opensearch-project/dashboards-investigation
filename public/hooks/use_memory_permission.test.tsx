/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useMemoryPermission } from './use_memory_permission';
import { getMemoryPermission } from '../components/notebooks/components/hypothesis/investigation/utils';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { BehaviorSubject } from 'rxjs';

// Mock dependencies
jest.mock('../components/notebooks/components/hypothesis/investigation/utils');
jest.mock('../../../../src/plugins/opensearch_dashboards_react/public');

const mockGetMemoryPermission = getMemoryPermission as jest.MockedFunction<
  typeof getMemoryPermission
>;
const mockUseOpenSearchDashboards = useOpenSearchDashboards as jest.MockedFunction<
  typeof useOpenSearchDashboards
>;

describe('useMemoryPermission', () => {
  const mockHttp = {} as any;
  const mockNotebookState = new BehaviorSubject({
    id: 'test-notebook',
    currentUser: 'test-user',
  } as any);

  const mockNotebookContext = {
    state: {
      getValue$: () => mockNotebookState,
      value: mockNotebookState.getValue(),
    },
  } as any;

  const wrapper: React.FC<any> = ({ children }) => (
    <NotebookReactContext.Provider value={mockNotebookContext}>
      {children}
    </NotebookReactContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOpenSearchDashboards.mockReturnValue({
      services: {
        http: mockHttp,
        application: {
          capabilities: {
            investigation: {
              ownerSupported: true,
            },
          },
        },
      },
    } as any);
  });

  describe('when user is the owner', () => {
    it('should return true immediately without calling getMemoryPermission', async () => {
      const { result } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'test-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      // Should return true immediately
      expect(result.current).toBe(true);
      expect(mockGetMemoryPermission).not.toHaveBeenCalled();
    });

    it('should return true when ownerSupported is false', async () => {
      mockUseOpenSearchDashboards.mockReturnValue({
        services: {
          http: mockHttp,
          application: {
            capabilities: {
              investigation: {
                ownerSupported: false,
              },
            },
          },
        },
      } as any);

      const { result } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      expect(result.current).toBe(true);
      expect(mockGetMemoryPermission).not.toHaveBeenCalled();
    });
  });

  describe('when user is not the owner', () => {
    it('should call getMemoryPermission and return the result', async () => {
      mockGetMemoryPermission.mockResolvedValue(true);

      const { result } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      // Initially false (before async check completes)
      expect(result.current).toBe(false);

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockGetMemoryPermission).toHaveBeenCalledWith({
        http: mockHttp,
        memoryContainerId: 'memory-123',
        messageId: 'message-456',
        dataSourceId: 'datasource-1',
      });
    });

    it('should return false when permission is denied', async () => {
      mockGetMemoryPermission.mockResolvedValue(false);

      const { result } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('when memoryContainerId or messageId is missing', () => {
    it('should return false when memoryContainerId is missing', async () => {
      const { result } = renderHook(
        () =>
          useMemoryPermission({
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(mockGetMemoryPermission).not.toHaveBeenCalled();
    });

    it('should return false when messageId is missing', async () => {
      const { result } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(mockGetMemoryPermission).not.toHaveBeenCalled();
    });
  });

  describe('when parameters change', () => {
    it('should recheck permission when memoryContainerId changes', async () => {
      mockGetMemoryPermission.mockResolvedValue(true);

      const { result, rerender } = renderHook(
        ({ memoryContainerId }: { memoryContainerId: string }) =>
          useMemoryPermission({
            memoryContainerId,
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        {
          wrapper,
          initialProps: { memoryContainerId: 'memory-123' },
        }
      );

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockGetMemoryPermission).toHaveBeenCalledTimes(1);

      // Change memoryContainerId
      mockGetMemoryPermission.mockResolvedValue(false);
      rerender({ memoryContainerId: 'memory-789' });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      expect(mockGetMemoryPermission).toHaveBeenCalledTimes(2);
      expect(mockGetMemoryPermission).toHaveBeenLastCalledWith({
        http: mockHttp,
        memoryContainerId: 'memory-789',
        messageId: 'message-456',
        dataSourceId: 'datasource-1',
      });
    });

    it('should update permission when currentUser changes', async () => {
      mockGetMemoryPermission.mockResolvedValue(false);

      const { result, rerender } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      // User becomes the owner
      mockNotebookState.next({
        id: 'test-notebook',
        currentUser: 'different-user',
      } as any);

      rerender();

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('cleanup', () => {
    it('should not update state after unmount', async () => {
      // Reset mockNotebookState to ensure clean state
      mockNotebookState.next({
        id: 'test-notebook',
        currentUser: 'test-user',
      } as any);

      let resolvePermission: (value: boolean) => void;
      const permissionPromise = new Promise<boolean>((resolve) => {
        resolvePermission = resolve;
      });

      mockGetMemoryPermission.mockReturnValue(permissionPromise);

      const { result, unmount } = renderHook(
        () =>
          useMemoryPermission({
            memoryContainerId: 'memory-123',
            messageId: 'message-456',
            owner: 'different-user',
            dataSourceId: 'datasource-1',
          }),
        { wrapper }
      );

      // Initially false (before async check completes)
      expect(result.current).toBe(false);

      // Unmount before permission check completes
      unmount();

      // Resolve permission after unmount
      resolvePermission!(true);

      // Wait a bit to ensure no state update happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // State should still be false (not updated after unmount)
      expect(result.current).toBe(false);
    });
  });
});
