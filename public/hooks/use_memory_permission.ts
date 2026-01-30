/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { HttpSetup } from '../../../../src/core/public';
import { getMemoryPermission } from '../components/notebooks/components/hypothesis/investigation/utils';

interface UseMemoryPermissionOptions {
  http: HttpSetup;
  memoryContainerId?: string;
  messageId?: string;
  dataSourceId?: string;
}

export const useMemoryPermission = ({
  http,
  memoryContainerId,
  messageId,
  dataSourceId,
}: UseMemoryPermissionOptions): boolean => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkPermission = async () => {
      if (!memoryContainerId || !messageId) {
        setHasPermission(false);
        return;
      }

      const result = await getMemoryPermission({
        http,
        memoryContainerId,
        messageId,
        dataSourceId,
      });

      if (isMounted) {
        setHasPermission(result);
      }
    };

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [http, memoryContainerId, messageId, dataSourceId]);

  return hasPermission;
};
