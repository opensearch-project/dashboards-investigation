/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';
import { concatMap, takeWhile } from 'rxjs/operators';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { executeMLCommonsMessageByTask } from '../../../../../../utils/ml_commons_apis';

export class PERAgentMessageService {
  private _dataSourceId?: string;
  private _message$ = new BehaviorSubject<unknown>(null);
  private _pollingState$ = new BehaviorSubject(false);
  _abortController?: AbortController;
  private _subscription?: Subscription;

  constructor(private _http: CoreStart['http'], private _memoryContainerId: string) {}

  setup({ dataSourceId, messageId }: { dataSourceId?: string; messageId: string }) {
    this._dataSourceId = dataSourceId;

    if (this._abortController) {
      return;
    }

    this._pollingState$.next(true);
    this._subscription = timer(0, 5000)
      .pipe(
        concatMap(() => {
          // return executeMLCommonsAgenticMessage({
          //   memoryContainerId: this._memoryContainerId,
          //   messageId,
          //   http: this._http,
          //   signal: this._abortController?.signal,
          //   dataSourceId: this._dataSourceId,
          // });
          return executeMLCommonsMessageByTask({
            http: this._http,
            dataSourceId: this._dataSourceId,
            taskId: messageId,
          });
        }),
        // takeWhile((message) => !message.hits.hits[0]._source.structured_data.response, true)
        takeWhile((message) => message.state !== 'COMPLETED', true)
      )
      .subscribe((message) => {
        this._message$.next(message);
        // if (!!message.hits.hits[0]._source.structured_data.response) {
        if (message.state === 'COMPLETED') {
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
