/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useContext, useCallback, useState } from 'react';
import { useObservable } from 'react-use';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import type { NoteBookServices } from 'public/types';
import type { DeepResearchInputParameters, DeepResearchOutputResult } from 'common/types/notebooks';

import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  ParagraphState,
  ParagraphStateValue,
} from '../../../../../../common/state/paragraph_state';
import { getLocalInputParameters } from '../../helpers/per_agent_helpers';

import { DeepResearchOutput } from './deep_research_output';
import { NotebookReactContext } from '../../../context_provider/context_provider';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../../common/constants/notebooks';
import { getInputType } from '../../../../../../common/utils/paragraph';
import { extractParentInteractionId } from '../../../../../../common/utils/task';
import { CoreStart } from '../../../../../../../../src/core/public';

import { PERAgentTaskService } from './services/per_agent_task_service';
import { MessageTraceFlyout } from './message_trace_flyout';
import { PERAgentMemoryService } from './services/per_agent_memory_service';
import { PERAgentMessageService } from './services/per_agent_message_service';

/**
 * Custom hook to initialize and manage PER Agent services
 */
const usePERAgentServices = (
  http: CoreStart['http'],
  paragraphState: ParagraphState<Partial<DeepResearchOutputResult>, DeepResearchInputParameters>
) => {
  // Initialize services
  // FIXME: Remove the task service in the production
  const taskService = useMemo(() => new PERAgentTaskService(http), [http]);
  const messageService = useMemo(() => new PERAgentMessageService(http), [http]);

  // Create executor memory ID observable
  const executorMemoryId$ = useMemo(
    () =>
      combineLatest([paragraphState.getValue$(), taskService.getExecutorMemoryId$()]).pipe(
        map(([currentParagraphValue, executorMemoryId]) => {
          if (
            currentParagraphValue &&
            !ParagraphState.getOutput(currentParagraphValue)?.result.executorAgentMemoryId
          ) {
            return executorMemoryId;
          }
          return ParagraphState.getOutput(currentParagraphValue)?.result.executorAgentMemoryId;
        })
      ),
    [paragraphState, taskService]
  );

  // Initialize executor memory service
  const executorMemoryService = useMemo(
    () =>
      new PERAgentMemoryService(http, executorMemoryId$, () => {
        return !messageService.getMessageValue()?.response;
      }),
    [http, executorMemoryId$, messageService]
  );

  return {
    task: taskService,
    message: messageService,
    executorMemory: executorMemoryService,
    executorMemoryId$,
  };
};

/**
 * Parse raw output result into a structured format
 */
const parseOutputResult = (rawOutputResult: any): Partial<DeepResearchOutputResult> | undefined => {
  if (typeof rawOutputResult !== 'string' || typeof rawOutputResult === 'undefined') {
    return rawOutputResult;
  }

  if (!rawOutputResult) {
    return undefined;
  }

  try {
    const parsedResult = JSON.parse(rawOutputResult) as { task_id?: string };
    if (typeof parsedResult?.task_id === 'string') {
      return {
        taskId: parsedResult.task_id,
      };
    }
  } catch (e) {
    console.error('Failed to parse output result', e);
  }

  return undefined;
};

export const DeepResearchParagraph = ({
  paragraphState,
  actionDisabled,
}: {
  paragraphState: ParagraphState<DeepResearchOutputResult, DeepResearchInputParameters>;
  actionDisabled: boolean;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();

  const { state, paragraphHooks } = useContext(NotebookReactContext);
  const [showContextModal, setShowContextModal] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();
  const [showSteps, setShowSteps] = useState(false);

  // Get paragraph and context values from observables
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const contextValue = useObservable(state.value.context.getValue$(), state.value.context.value);

  // Initialize PER Agent services
  const PERAgentServices = usePERAgentServices(http, paragraphState);

  // Get message observable and current message
  const message$ = useMemo(() => PERAgentServices.message.getMessage$(), [
    PERAgentServices.message,
  ]);
  const message = useObservable(message$);

  // Get input parameters and message status
  const input =
    (paragraphValue.input.parameters as DeepResearchInputParameters) || paragraphValue.input;
  const messageLoaded = !!message;
  const messageFinished = !!message && !!message.response;
  const executorMemoryId = useObservable(PERAgentServices.executorMemoryId$);

  const { runParagraph } = paragraphHooks;
  const rawOutputResult = ParagraphState.getOutput(paragraphValue)?.result;
  // FIXME: Read paragraph out directly once all notebooks store object as output
  const outputResult = useMemo(() => parseOutputResult(rawOutputResult), [rawOutputResult]);
  const isFirstDeepResearchParagraph = useMemo(() => {
    const firstDeepResearchParagraph = state.value.paragraphs.find(
      (item) => getInputType(item.value) === DEEP_RESEARCH_PARAGRAPH_TYPE
    );
    return firstDeepResearchParagraph?.value.id === paragraphValue.id;
  }, [state.value.paragraphs, paragraphValue]);

  // Handler for running paragraphs
  const runParagraphHandler = useCallback(
    async (inputPayload?: Partial<ParagraphStateValue['input']>) => {
      paragraphState.updateInput({
        ...inputPayload,
        parameters: getLocalInputParameters(contextValue.dataSourceId),
      });
      await runParagraph({
        id: paragraphValue.id,
      });
    },
    [runParagraph, paragraphState, paragraphValue.id, contextValue.dataSourceId]
  );

  // Auto-run paragraph if there's an initial goal
  useEffect(() => {
    if (
      !paragraphValue.uiState?.isRunning &&
      !paragraphValue.input.inputText &&
      paragraphValue.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE &&
      contextValue.initialGoal &&
      !outputResult?.taskId
    ) {
      runParagraphHandler({
        inputText: contextValue.initialGoal,
      });
    }
  }, [contextValue, paragraphValue, outputResult, runParagraphHandler]);

  // Update UI state with available actions
  useEffect(() => {
    const actions = [];

    // Add show/hide steps action if executor memory and response exist
    if (executorMemoryId && !!message?.response) {
      actions.push({
        name: `${showSteps ? 'Hide' : 'Show'} steps`,
        action: () => setShowSteps((flag) => !flag),
      });
    }

    // Add show agent inputs action if message or task ID exists
    if (outputResult?.messageId || outputResult?.taskId) {
      actions.push({
        name: 'Show agent inputs',
        action: () => setShowContextModal(true),
      });
    }

    // Add re-run action for AI response type
    if (
      (paragraphValue.input.inputType === AI_RESPONSE_TYPE || isFirstDeepResearchParagraph) &&
      !actionDisabled
    ) {
      actions.push({
        name: 'Re-Run',
        action: runParagraphHandler,
      });
    }

    paragraphState.updateUIState({ actions });
  }, [
    paragraphState,
    outputResult?.taskId,
    outputResult?.messageId,
    showSteps,
    paragraphValue.input.inputType,
    runParagraphHandler,
    actionDisabled,
    isFirstDeepResearchParagraph,
    message?.response,
    executorMemoryId,
  ]);

  // Setup message and task services based on output result
  useEffect(() => {
    const dataSourceId = paragraphValue.dataSourceMDSId;

    // If we have a message ID, set up the message service
    if (outputResult?.messageId) {
      PERAgentServices.message.setup({
        messageId: outputResult.messageId,
        dataSourceId,
      });
      return () => {
        PERAgentServices.message.stop('Unmount');
      };
    }

    // Otherwise reset message service and set up task service if we have a task ID
    PERAgentServices.message.reset();
    const taskId = outputResult?.taskId;

    if (!taskId) {
      PERAgentServices.task.reset();
      return;
    }

    // Set up task service and subscribe to task updates
    PERAgentServices.task.setup({
      taskId,
      dataSourceId,
    });

    const subscription = PERAgentServices.task.getTask$().subscribe((task) => {
      const parentInteractionId = task && extractParentInteractionId(task);
      if (parentInteractionId) {
        PERAgentServices.message.setup({
          messageId: parentInteractionId,
          dataSourceId,
        });
      }
    });

    return () => {
      PERAgentServices.task.stop('Unmount');
      subscription.unsubscribe();
    };
  }, [
    outputResult?.taskId,
    outputResult?.messageId,
    paragraphValue.dataSourceMDSId,
    PERAgentServices.task,
    PERAgentServices.message,
  ]);

  // Setup executor memory service
  useEffect(() => {
    PERAgentServices.executorMemory.setup({
      dataSourceId: paragraphValue.dataSourceMDSId,
    });
    return () => {
      PERAgentServices.executorMemory.stop('Unmount');
    };
  }, [paragraphValue.dataSourceMDSId, PERAgentServices.executorMemory]);

  // Clean output result and show steps when paragraph is running
  useEffect(() => {
    if (paragraphValue.uiState?.isRunning) {
      paragraphState.updateOutput({ result: {} });
      setShowSteps(true);
    }
  }, [paragraphValue.uiState?.isRunning, paragraphState]);

  // Update steps visibility based on message status
  useEffect(() => {
    if (messageLoaded) {
      setShowSteps(!messageFinished);
    }
  }, [messageLoaded, messageFinished]);

  // Render agent input tabs for the context modal
  const renderAgentInputTabs = () => {
    const tabs = [];

    if ((input as DeepResearchInputParameters)?.PERAgentInput) {
      const perAgentInput = (input as DeepResearchInputParameters).PERAgentInput;
      let parsedBody: any = {};

      try {
        if (perAgentInput?.body && typeof perAgentInput.body === 'string') {
          parsedBody = JSON.parse(perAgentInput.body);
        }
      } catch (e) {
        console.error('Failed to parse PERAgentInput body', e);
      }

      tabs.push({
        id: 'agentInput',
        name: 'Agent input',
        content: (
          <EuiMarkdownFormat>
            {`\`\`\`json
${JSON.stringify(
  {
    ...perAgentInput,
    body: parsedBody,
  },
  null,
  2
)}
            \`\`\`
            `}
          </EuiMarkdownFormat>
        ),
      });
    }

    if (input?.PERAgentContext) {
      tabs.push({
        id: 'agentContext',
        name: 'Agent context',
        content: <EuiMarkdownFormat>{input?.PERAgentContext || 'No context'}</EuiMarkdownFormat>,
      });
    }

    return tabs;
  };

  return (
    <>
      {/* User input display */}
      <EuiFlexGroup gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiAvatar name={state.value.owner ?? 'User'} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
            <EuiText size="s">
              <p>{paragraphValue.input.inputText}</p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false} />
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {/* Deep research output component */}
      <DeepResearchOutput
        messageService={PERAgentServices.message}
        executorMemoryService={PERAgentServices.executorMemory}
        showSteps={showSteps}
        onExplainThisStep={setTraceMessageId}
      />
      <EuiSpacer />
      {/* FIXME this is used for debug */}
      {showContextModal && (
        <EuiModal onClose={() => setShowContextModal(false)}>
          <EuiModalHeader>Context</EuiModalHeader>
          <EuiModalBody>
            <EuiTabbedContent tabs={renderAgentInputTabs()} />
          </EuiModalBody>
        </EuiModal>
      )}

      {/* Message trace flyout */}
      {traceMessageId && (
        <MessageTraceFlyout
          messageId={traceMessageId}
          messageService={PERAgentServices.message}
          executorMemoryService={PERAgentServices.executorMemory}
          onClose={() => {
            setTraceMessageId(undefined);
          }}
          dataSourceId={paragraphValue.dataSourceMDSId}
        />
      )}
    </>
  );
};
