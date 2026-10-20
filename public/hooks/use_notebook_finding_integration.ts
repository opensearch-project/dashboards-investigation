/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useCallback, useRef, useContext } from 'react';
import { FindingService, Finding, CallbackUnsubscribe } from '../services/finding_service';
import { useInvestigation } from './use_investigation';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';

export interface UseNotebookFindingIntegrationProps {
  findingService: FindingService;
  notebookId: string;
}

/**
 * Hook that integrates the FindingService callback system with notebook state management.
 * Automatically updates the notebook UI when findings are added through the suggestion service.
 *
 * @param props - Configuration object containing findingService and notebookId
 * @returns Object with integration status and utility functions
 */
export const useNotebookFindingIntegration = (props: UseNotebookFindingIntegrationProps) => {
  const { findingService, notebookId } = props;
  const { addNewFinding } = useInvestigation();
  const unsubscribeRef = useRef<CallbackUnsubscribe | null>(null);
  const isIntegratedRef = useRef<boolean>(false);
  const context = useContext(NotebookReactContext);
  const contextStateRef = useRef(context.state);
  const addNewFindingRef = useRef(addNewFinding);

  contextStateRef.current = context.state;
  addNewFindingRef.current = addNewFinding;

  /**
   * Callback function that handles finding additions by creating new paragraphs
   * in the notebook and updating the UI state.
   */
  const handleFindingAdded = useCallback(
    async (finding: Finding, findingNotebookId?: string) => {
      try {
        console.log('Adding a new finding from chatbot', finding);
        // Only process findings for the current notebook
        if (findingNotebookId !== notebookId) {
          return;
        }

        await addNewFindingRef.current({
          text: `%md\n${finding.markdown}`,
        });

        contextStateRef.current.updateValue({
          dateModified: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to add finding paragraph to notebook:', error, {
          findingId: finding.id,
          notebookId,
        });
        // Don't throw error to prevent blocking other callbacks
      }
    },
    [notebookId]
  );

  /**
   * Registers the callback with the FindingService
   */
  const registerCallback = useCallback(() => {
    if (!findingService || isIntegratedRef.current) {
      return;
    }

    try {
      const unsubscribe = findingService.registerCallback('onFindingAdded', handleFindingAdded);
      unsubscribeRef.current = unsubscribe;
      isIntegratedRef.current = true;

      console.log(`Registered finding callback for notebook ${notebookId}`);
    } catch (error) {
      console.error('Failed to register finding callback:', error);
    }
  }, [findingService, handleFindingAdded, notebookId]);

  /**
   * Unregisters the callback from the FindingService
   */
  const unregisterCallback = useCallback(() => {
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isIntegratedRef.current = false;

        console.log(`Unregistered finding callback for notebook ${notebookId}`);
      } catch (error) {
        console.error('Failed to unregister finding callback:', error);
      }
    }
  }, [notebookId]);

  // Register callback on mount and when dependencies change
  useEffect(() => {
    registerCallback();

    // Cleanup on unmount or dependency change
    return () => {
      unregisterCallback();
    };
  }, [registerCallback, unregisterCallback]);

  // Additional cleanup on unmount to ensure no memory leaks
  useEffect(() => {
    return () => {
      unregisterCallback();
    };
  }, [unregisterCallback]);

  return {
    /**
     * Whether the integration is currently active
     */
    isIntegrated: isIntegratedRef.current,

    /**
     * Manually register the callback (useful for re-registration after errors)
     */
    registerCallback,

    /**
     * Manually unregister the callback
     */
    unregisterCallback,
  };
};
