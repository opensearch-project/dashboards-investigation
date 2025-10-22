/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Observable } from 'rxjs';
import { BaseEvent, RunAgentInput } from '../../common/types/ag_ui_types';

interface OSDAGUIAgentConfig {
  makeHttpRequest: (input: RunAgentInput, signal: AbortSignal) => Promise<Response>;
}

export enum EventType {
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
}

/**
 * AG-UI SDK does not provide a http agent that can customize fetch module,
 * let's use https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/http.ts
 * as reference to construct our own http agent
 */
export class OSDAGUIAgent {
  private abortController: AbortController | undefined;
  private activeConnection: boolean = false;
  private makeHttpRequest: OSDAGUIAgentConfig['makeHttpRequest'];
  private sseBuffer: string = '';

  public runAgent(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      // Only abort if we're not in the middle of an active connection
      // This prevents tool result submissions from breaking the main SSE stream
      if (this.abortController && !this.activeConnection) {
        this.abortController.abort();
      }

      // If there's already an active connection, reuse the existing controller
      if (!this.abortController) {
        this.abortController = new AbortController();
        this.sseBuffer = ''; // Reset buffer for new request
      }

      // Set active connection flag
      this.activeConnection = true;

      // Make request to AG-UI server
      this.makeHttpRequest(input, this.abortController.signal)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body reader available');
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              // Parse Server-Sent Events with proper buffering
              const chunk = new TextDecoder().decode(value);
              const allData = this.sseBuffer + chunk;
              const lines = allData.split('\n');

              // Keep the last incomplete line in buffer
              this.sseBuffer = lines[lines.length - 1];
              const completeLines = lines.slice(0, -1);

              for (const line of completeLines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    observer.next(data);
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', line, e);
                  }
                }
              }
            }

            this.activeConnection = false;
            observer.complete();
          } finally {
            reader.releaseLock();
            this.activeConnection = false;
          }
        })
        .catch((error) => {
          this.activeConnection = false;

          if (error.name === 'AbortError') {
            return; // Request was cancelled
          }

          observer.next({
            type: EventType.RUN_ERROR,
            message: error.message,
          } as any);

          observer.error(error);
        });
    });
  }

  abortRun() {
    this.abortController?.abort();
  }

  constructor(config: OSDAGUIAgentConfig) {
    this.makeHttpRequest = config.makeHttpRequest;
  }
}
