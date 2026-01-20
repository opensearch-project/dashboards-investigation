/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { OverlayStart } from '../../../../src/core/public';

export const useSidecarPadding = (overlays: OverlayStart) => {
  const [paddingRight, setPaddingRight] = useState('0px');

  useEffect(() => {
    const subscription = overlays.sidecar.getSidecarConfig$().subscribe((config) => {
      if (config?.dockedMode === 'right') {
        setPaddingRight(`${config.paddingSize}px`);
      } else {
        setPaddingRight('0px');
      }
    });
    return () => subscription.unsubscribe();
  }, [overlays]);

  return paddingRight;
};
