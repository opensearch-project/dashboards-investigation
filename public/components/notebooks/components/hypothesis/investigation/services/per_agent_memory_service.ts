/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';
import { concatMap, takeWhile } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { getAllMessagesBySessionIdAndMemoryId } from '../utils';

export class PERAgentMemoryService {
  private _dataSourceId?: string;
  private _pollingMemoryId?: string;
  private _poolingFinished?: boolean;
  private _messages$ = new BehaviorSubject<any[]>([]);
  private _pollingState$ = new BehaviorSubject(false);
  _abortController?: AbortController;
  private _memorySubscription?: Subscription;
  private _subscription?: Subscription;

  constructor(
    private _http: CoreStart['http'],
    private _memoryId$: Observable<string>,
    private _shouldContinuePolling: () => boolean,
    private _memoryContainerId: string
  ) {}

  setup({ dataSourceId }: { dataSourceId?: string }) {
    this._dataSourceId = dataSourceId;
  }

  startPolling() {
    if (!this._http || this._abortController) {
      return;
    }
    const http = this._http;
    this._abortController = new AbortController();

    // Unsubscribe from any existing subscription
    this._memorySubscription?.unsubscribe();
    this._subscription?.unsubscribe();

    // Create task subscription
    this._memorySubscription = this._memoryId$.subscribe((memoryId) => {
      // Unsubscribe from previous polling subscription when memoryId changes
      this._subscription?.unsubscribe();

      if (this._pollingMemoryId !== memoryId) {
        this._poolingFinished = false;
        this._messages$.next([]);
      }

      if (!memoryId || this._poolingFinished) {
        return;
      }
      this._pollingMemoryId = memoryId;
      this._pollingState$.next(true);

      this._subscription = timer(0, 5000)
        .pipe(
          concatMap(() => {
            const originalMessages = this._messages$.getValue();
            const lastMessage = originalMessages[originalMessages.length - 1];
            const previousMessages = lastMessage?.response
              ? originalMessages
              : originalMessages.slice(0, -1);

            return getAllMessagesBySessionIdAndMemoryId({
              memoryContainerId: this._memoryContainerId,
              sessionId: memoryId,
              http,
              signal: this._abortController?.signal,
              dataSourceId: this._dataSourceId,
              nextToken: previousMessages.length,
            }).then((newMessages) => [...previousMessages, ...newMessages]);
          }),
          takeWhile(() => this._shouldContinuePolling(), true)
        )
        .subscribe((messages) => {
          this._messages$.next(messages);
          if (!this._shouldContinuePolling()) {
            this._pollingState$.next(false);
            this._poolingFinished = true;
          }
        });
    });
    return () => {
      this._stopPolling();
    };
  }

  private _stopPolling(reason?: string) {
    if (!this._abortController) {
      return;
    }
    this._pollingState$.next(false);
    this._abortController?.abort(reason ?? 'Stop polling');
    this._abortController = undefined;
    // Unsubscribe from any existing subscription
    this._memorySubscription?.unsubscribe();
    this._subscription?.unsubscribe();
  }

  stop(reason?: string) {
    this._stopPolling(reason);
    this._messages$.next([]);
  }

  getMessages$ = (): Observable<any[]> => this._messages$.asObservable();

  getPollingState$ = () => this._pollingState$.asObservable();
}
