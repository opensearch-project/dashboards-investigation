/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Observable, timer, throwError, from, of } from 'rxjs';
import { concatMap, takeWhile, finalize, shareReplay, catchError, timeout } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { getFinalMessage } from '../utils';
import {
  INTERVAL_TIME,
  REQUEST_TIMEOUT_MS,
} from '../../../../../../../common/constants/investigation';

interface PollingInstance {
  observable: Observable<any>;
  abortController: AbortController;
}

const TIMEOUT_MS = 20 * 60 * 1000;
const MAX_ERROR_COUNT = 5;

export class SharedMessagePollingService {
  private static instance: SharedMessagePollingService;
  private currentPolling: PollingInstance | null = null;

  private constructor(private http: CoreStart['http']) {}

  static getInstance(http: CoreStart['http']) {
    if (!this.instance) {
      this.instance = new SharedMessagePollingService(http);
    }
    return this.instance;
  }

  poll({
    memoryContainerId,
    messageId,
    dataSourceId,
    pollInterval = INTERVAL_TIME,
  }: {
    memoryContainerId: string;
    messageId: string;
    dataSourceId?: string;
    pollInterval?: number;
  }): Observable<any> {
    if (this.currentPolling) {
      return this.currentPolling.observable;
    }

    let abortController = new AbortController();
    const startTime = Date.now();
    let errorCount = 0;

    const source$ = timer(0, pollInterval).pipe(
      concatMap(() => {
        if (Date.now() - startTime > TIMEOUT_MS) {
          return throwError(new Error('Investigation polling exceeded 20 minutes'));
        }

        return from(
          getFinalMessage({
            memoryContainerId,
            messageId,
            http: this.http,
            signal: abortController.signal,
            dataSourceId,
          })
        ).pipe(
          timeout(REQUEST_TIMEOUT_MS),
          catchError((err) => {
            console.log(err);
            if (err.name === 'TimeoutError') {
              abortController.abort();
              // Create new AbortController for next request since the old one is aborted
              abortController = new AbortController();
            }
            errorCount += 1;

            if (errorCount >= MAX_ERROR_COUNT) {
              return throwError(new Error(`Polling failed after ${errorCount} errors`));
            }
            return of(null);
          })
        );
      }),
      takeWhile((message) => !message, true),
      finalize(() => {
        this.cleanup();
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.currentPolling = {
      observable: source$,
      abortController,
    };

    return source$;
  }

  private cleanup() {
    if (!this.currentPolling) return;

    this.currentPolling.abortController.abort();
    this.currentPolling = null;
  }
}
