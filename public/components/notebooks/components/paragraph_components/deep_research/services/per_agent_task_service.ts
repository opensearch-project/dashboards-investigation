/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { concatMap, map, takeWhile } from 'rxjs/operators';

import { getMLCommonsTask } from '../../../../../../utils/ml_commons_apis';
import {
  extractExecutorMemoryId,
  isStateCompletedOrFailed,
} from '../../../../../../../common/utils/task';
import type { CoreStart } from '../../../../../../../../../src/core/public';

export class PERAgentTaskService {
  private _abortController = new AbortController();
  private _task$ = new BehaviorSubject(null);
  private _taskLoadingState$ = new BehaviorSubject(false);
  private _subscription?: Subscription;

  constructor(private _httpService: CoreStart['http']) {}

  setup({ taskId, dataSourceId }: { taskId: string; dataSourceId?: string }) {
    this._abortController?.abort('Setup');
    this._abortController = new AbortController();
    this._taskLoadingState$.next(true);
    this._subscription = timer(0, 5000)
      .pipe(
        concatMap(() => {
          return getMLCommonsTask({
            http: this._httpService,
            taskId,
            dataSourceId,
            signal: this._abortController.signal,
          });
        })
      )
      .pipe(takeWhile((res) => this._shouldContinuePolling(res), true))
      .subscribe((newTask) => {
        const previousTask = this._task$.getValue();
        newTask = { taskId, ...newTask };
        if (JSON.stringify(previousTask) === JSON.stringify(newTask)) {
          return;
        }
        if (this._shouldContinuePolling(newTask)) {
          this._taskLoadingState$.next(false);
        }
        this._task$.next(newTask);
      });
  }

  getLoadingState$() {
    return this._taskLoadingState$.asObservable();
  }

  getTask$() {
    return this._task$.asObservable();
  }

  getTaskValue() {
    return this._task$.getValue();
  }

  getTaskId() {
    return this._task$.getValue()?.taskId;
  }

  getExecutorMemoryId$() {
    return this.getTask$().pipe(map((task) => extractExecutorMemoryId(task)));
  }

  stop(reason?: string) {
    this._subscription?.unsubscribe();
    this._abortController.abort(reason);
    this._subscription = undefined;
  }

  reset() {
    this._task$.next(null);
  }

  private _shouldContinuePolling(task) {
    return !task || (!extractExecutorMemoryId(task) && !isStateCompletedOrFailed(task.state));
  }
}
