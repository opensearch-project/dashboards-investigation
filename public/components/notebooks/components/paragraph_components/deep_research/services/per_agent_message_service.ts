/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';
import { concatMap, takeWhile } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { getMLCommonsMessage } from '../../../../../../utils/ml_commons_apis';

export class PERAgentMessageService {
  private _dataSourceId?: string;
  private _message$ = new BehaviorSubject<unknown>(null);
  private _pollingState$ = new BehaviorSubject(false);
  _abortController?: AbortController;
  private _subscription?: Subscription;

  constructor(private _http: CoreStart['http']) {}

  setup({ dataSourceId, messageId }: { dataSourceId?: string; messageId: string }) {
    this._dataSourceId = dataSourceId;

    if (this._abortController) {
      return;
    }

    this._pollingState$.next(true);
    this._subscription = timer(0, 5000)
      .pipe(
        concatMap(() => {
          return getMLCommonsMessage({
            messageId,
            http: this._http,
            signal: this._abortController?.signal,
            dataSourceId: this._dataSourceId,
          });
        }),
        takeWhile((message) => !message.response, true)
      )
      .subscribe((message) => {
        this._message$.next(message);
        if (!!message.response) {
          this._pollingState$.next(false);
        }
      });
  }

  stop(reason?: string) {
    this._abortController?.abort(reason);
    this._subscription?.unsubscribe();
    this._message$.next(null);
    this._pollingState$.next(false);
  }

  getMessage$ = (): Observable<any> => this._message$.asObservable();

  getMessageValue = () => this._message$.getValue();

  getPollingState$ = () => this._pollingState$.asObservable();

  reset() {
    this._message$.next(null);
  }
}
