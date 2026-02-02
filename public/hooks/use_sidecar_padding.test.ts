/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useSidecarPadding } from './use_sidecar_padding';
import { BehaviorSubject } from 'rxjs';

describe('useSidecarPadding', () => {
  const mockSidecarConfig$ = new BehaviorSubject<any>(null);
  const mockOverlays = {
    sidecar: {
      getSidecarConfig$: jest.fn(() => mockSidecarConfig$),
    },
  } as any;

  afterEach(() => {
    mockSidecarConfig$.next(null);
  });

  it('should return 0px when no config', () => {
    const { result } = renderHook(() => useSidecarPadding(mockOverlays));
    expect(result.current).toBe('0px');
  });

  it('should return padding when docked right', () => {
    const { result } = renderHook(() => useSidecarPadding(mockOverlays));
    act(() => {
      mockSidecarConfig$.next({ dockedMode: 'right', paddingSize: 300 });
    });
    expect(result.current).toBe('300px');
  });

  it('should return 0px when not docked right', () => {
    const { result } = renderHook(() => useSidecarPadding(mockOverlays));
    act(() => {
      mockSidecarConfig$.next({ dockedMode: 'left', paddingSize: 300 });
    });
    expect(result.current).toBe('0px');
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useSidecarPadding(mockOverlays));
    unmount();
    expect(mockOverlays.sidecar.getSidecarConfig$).toHaveBeenCalled();
  });
});
