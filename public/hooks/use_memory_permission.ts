/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useEffect, useState } from 'react';
import { useObservable } from 'react-use';
import { getMemoryPermission } from '../components/notebooks/components/hypothesis/investigation/utils';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../types';

interface UseMemoryPermissionOptions {
  memoryContainerId?: string;
  messageId?: string;
  owner?: string;
  dataSourceId?: string;
}

export const useMemoryPermission = ({
  memoryContainerId,
  messageId,
  owner,
  dataSourceId,
}: UseMemoryPermissionOptions): boolean => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { http, application },
  } = useOpenSearchDashboards<NoteBookServices>();

  const { currentUser } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const [hasPermission, setHasPermission] = useState(false);

  const isOwner = application.capabilities.investigation?.ownerSupported
    ? !!currentUser && currentUser === owner
    : true;

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

    if (isOwner) {
      setHasPermission(isOwner);
    } else {
      checkPermission();
    }

    return () => {
      isMounted = false;
    };
  }, [http, memoryContainerId, messageId, dataSourceId, isOwner]);

  return hasPermission;
};
