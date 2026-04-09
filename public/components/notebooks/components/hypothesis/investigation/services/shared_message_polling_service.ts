/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Observable, timer, throwError, from, of } from 'rxjs';
import { concatMap, takeWhile, finalize, shareReplay, catchError, timeout } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { getFinalMessage, FinalMessageResult } from '../utils';
import {
  INTERVAL_TIME,
  REQUEST_TIMEOUT_MS,
} from '../../../../../../../common/constants/investigation';
import { PollingTimeoutError } from '../errors/polling_timeout_error';
import { PollingMaxErrorsError } from '../errors/polling_max_errors_error';

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
  }): Observable<FinalMessageResult | null> {
    if (this.currentPolling) {
      return this.currentPolling.observable;
    }

    let abortController = new AbortController();
    const startTime = Date.now();
    let errorCount = 0;

    const source$ = timer(0, pollInterval).pipe(
      concatMap(() => {
        if (Date.now() - startTime > TIMEOUT_MS) {
          return throwError(new PollingTimeoutError());
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
            if (err.name === 'TimeoutError') {
              abortController.abort();
              // Create new AbortController for next request since the old one is aborted
              abortController = new AbortController();
            }
            errorCount += 1;

            if (errorCount >= MAX_ERROR_COUNT) {
              return throwError(new PollingMaxErrorsError(errorCount));
            }
            return of(null);
          })
        );
      }),
      takeWhile((result) => !result?.message, true),
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
