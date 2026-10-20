/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { AgenticMemory } from '../../common/types/notebooks';
import { HttpSetup } from '../../../../src/core/public';
import { PERAgentMemoryService } from '../components/notebooks/components/hypothesis/investigation/services/per_agent_memory_service';
import { PERAgentMessageService } from '../components/notebooks/components/hypothesis/investigation/services/per_agent_message_service';

interface UsePERAgentServicesParams {
  http: HttpSetup;
  isInvestigating: boolean;
  memory?: AgenticMemory;
  dataSourceId?: string;
}

interface PERAgentServices {
  message: PERAgentMessageService;
  executorMemory: PERAgentMemoryService;
}

export const usePERAgentServices = ({
  http,
  memory,
  dataSourceId,
  isInvestigating,
}: UsePERAgentServicesParams): PERAgentServices | null => {
  const PERAgentServices = useMemo(() => {
    if (!memory?.executorMemoryId || !memory?.memoryContainerId) {
      return null;
    }

    const executorMemoryId$ = new BehaviorSubject(memory.executorMemoryId);
    const messageService = new PERAgentMessageService(http, memory.memoryContainerId);
    const executorMemoryService = new PERAgentMemoryService(
      http,
      executorMemoryId$,
      () => {
        if (!isInvestigating && memory) {
          return false;
        }
        return !messageService.getMessageValue();
      },
      memory.memoryContainerId
    );

    return { message: messageService, executorMemory: executorMemoryService };
  }, [http, memory, isInvestigating]);

  useEffect(() => {
    if (PERAgentServices && memory?.parentInteractionId) {
      // Only setup message polling when investigating
      if (isInvestigating) {
        PERAgentServices.message.setup({
          messageId: memory.parentInteractionId,
          dataSourceId,
        });
      }
      PERAgentServices.executorMemory.setup({ dataSourceId });

      return () => {
        PERAgentServices.message.stop();
        PERAgentServices.executorMemory.stop('Flyout unmount');
      };
    }
  }, [PERAgentServices, memory, dataSourceId, isInvestigating]);

  return PERAgentServices;
};
