/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import uuid from 'uuid';

export interface Finding {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  markdown: string;
  notebookId?: string;
}

export interface StoreFindingParams {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  markdown: string;
  notebookId?: string;
  paragraphId?: string;
  datasourceId?: string;
}

/**
 * Callback function type for finding events
 * @param finding - The finding that was added
 * @param notebookId - The notebook ID where the finding was added (if applicable)
 */
export type FindingCallback = (finding: Finding, notebookId?: string) => Promise<void> | void;

/**
 * Interface for managing callback collections by event type
 */
export interface FindingServiceCallbacks {
  onFindingAdded: FindingCallback[];
}

/**
 * Return type for callback registration - provides unsubscribe function
 */
export type CallbackUnsubscribe = () => void;

export class FindingService {
  private findings: Map<string, Finding> = new Map();
  private callbacks: FindingServiceCallbacks;
  private notebookId: string | undefined;

  public get currentNotebookId(): string | undefined {
    return this.notebookId;
  }

  constructor() {
    this.callbacks = {
      onFindingAdded: [],
    };
  }

  initialize(notebookId: string) {
    this.notebookId = notebookId;
  }

  /**
   * Register a callback for finding events
   * @param event - The event type to listen for
   * @param callback - The callback function to register
   * @returns Unsubscribe function to remove the callback
   */
  registerCallback(event: 'onFindingAdded', callback: FindingCallback): CallbackUnsubscribe {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.callbacks[event].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    };
  }

  /**
   * Invoke all registered callbacks for a specific event
   * @param event - The event type to invoke callbacks for
   * @param args - Arguments to pass to the callbacks
   */
  private async invokeCallbacks(
    event: keyof FindingServiceCallbacks,
    ...args: [Finding, string?]
  ): Promise<void> {
    const callbacks = this.callbacks[event];

    if (!callbacks || callbacks.length === 0) {
      return;
    }

    // Execute all callbacks, catching individual errors to prevent one failure from blocking others
    const callbackPromises = callbacks.map(async (callback) => {
      try {
        const result = callback(...args);
        // Handle both sync and async callbacks
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Error executing ${event} callback:`, error);
        // Log error but don't throw to prevent blocking other callbacks
      }
    });

    // Wait for all callbacks to complete
    await Promise.allSettled(callbackPromises);
  }

  async addFinding(input: string, output: string, notebookId?: string): Promise<Finding> {
    const id = uuid.v4();
    const timestamp = Date.now();
    const markdown = `## Investigation Finding

**Input:** ${input}

**Output:** ${output}

**Timestamp:** ${new Date(timestamp).toISOString()}

---
`;

    const finding: Finding = {
      id,
      input,
      output,
      timestamp,
      markdown,
      notebookId,
    };

    this.findings.set(id, finding);

    try {
      // Only invoke callbacks after successful storage
      await this.invokeCallbacks('onFindingAdded', finding, notebookId || this.notebookId);
    } catch (error) {
      console.error('Failed to store finding via HTTP API:', error);
      // Continue execution even if HTTP storage fails
    }

    return finding;
  }

  getFindings(): Finding[] {
    return Array.from(this.findings.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  getFinding(id: string): Finding | undefined {
    return this.findings.get(id);
  }

  clearFindings(): void {
    this.findings.clear();
  }
}
