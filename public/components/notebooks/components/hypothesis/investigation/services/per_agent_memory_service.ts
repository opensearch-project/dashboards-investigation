/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Observable, Subscription, timer, from } from 'rxjs';
import { concatMap, takeWhile, timeout, retryWhen, delay, scan } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { getAllMessagesBySessionIdAndMemoryId } from '../utils';
import {
  INTERVAL_TIME,
  REQUEST_TIMEOUT_MS,
} from '../../../../../../../common/constants/investigation';

export class PERAgentMemoryService {
  private _dataSourceId?: string;
  private _pollingMemoryId?: string;
  private _pollingFinished = false;

  private _messages$ = new BehaviorSubject<any[]>([]);
  private _pollingState$ = new BehaviorSubject<boolean>(false);
  private _error$ = new BehaviorSubject<string | null>(null);

  private _abortController?: AbortController;
  private _memorySubscription?: Subscription;
  private _pollingSubscription?: Subscription;

  private _hasError = false;

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

    this._abortController = new AbortController();

    // clean previous
    this._memorySubscription?.unsubscribe();
    this._pollingSubscription?.unsubscribe();

    this._memorySubscription = this._memoryId$.subscribe((memoryId) => {
      // memoryId changed → reset polling subscription
      this._pollingSubscription?.unsubscribe();

      if (this._pollingMemoryId !== memoryId) {
        this._pollingFinished = false;
        this._hasError = false;
        this._error$.next(null);
        this._messages$.next([]);
      }

      if (!memoryId || this._pollingFinished) {
        return;
      }

      this._pollingMemoryId = memoryId;
      this._pollingState$.next(true);

      this._pollingSubscription = timer(1500, INTERVAL_TIME)
        .pipe(
          takeWhile(() => this._shouldContinuePolling() && !this._hasError, true),
          concatMap(() => this._fetchMessages(memoryId)),
          timeout(REQUEST_TIMEOUT_MS),
          retryWhen((errors) =>
            errors.pipe(
              delay(INTERVAL_TIME),
              scan((retryCount, err) => {
                if (retryCount >= 2) {
                  throw err;
                }
                return retryCount + 1;
              }, 0)
            )
          )
        )
        .subscribe({
          next: (messages) => {
            this._messages$.next(messages);

            if (!this._shouldContinuePolling()) {
              this._pollingFinished = true;
              this._pollingState$.next(false);
            }
          },
          error: (err) => {
            if (err.name !== 'AbortError') {
              const errorMessage = err.body?.message || err?.message || 'Unknown error occurred';
              this._hasError = true;
              this._error$.next(errorMessage);
              this._stopPolling();
            }
          },
        });
    });

    return () => this._stopPolling('stopPolling called');
  }

  retry() {
    if (!this._hasError) return;

    this._hasError = false;
    this._error$.next(null);

    // continue polling from current state
    this.startPolling();
  }

  stop(reason?: string) {
    this._stopPolling(reason);
    this._messages$.next([]);
  }

  getMessages$(): Observable<any[]> {
    return this._messages$.asObservable();
  }

  getPollingState$(): Observable<boolean> {
    return this._pollingState$.asObservable();
  }

  getError$(): Observable<string | null> {
    return this._error$.asObservable();
  }

  private _fetchMessages(memoryId: string) {
    const http = this._http;
    const existingMessages = this._messages$.getValue();
    const lastMessage = existingMessages[existingMessages.length - 1];

    const previousMessages = lastMessage?.response
      ? existingMessages
      : existingMessages.slice(0, -1);

    return from(
      getAllMessagesBySessionIdAndMemoryId({
        memoryContainerId: this._memoryContainerId,
        sessionId: memoryId,
        http,
        signal: this._abortController?.signal,
        dataSourceId: this._dataSourceId,
        nextToken: previousMessages.length,
      })
    ).pipe(
      concatMap((newMessages) => {
        return [[...previousMessages, ...newMessages]];
      })
    );
  }

  private _stopPolling(reason?: string) {
    this._pollingState$.next(false);
    this._abortController?.abort(reason ?? 'Stop polling');
    this._abortController = undefined;

    this._memorySubscription?.unsubscribe();
    this._pollingSubscription?.unsubscribe();

    this._memorySubscription = undefined;
    this._pollingSubscription = undefined;
  }
}
