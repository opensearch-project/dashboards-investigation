/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { CoreStart } from '../../../../../../../../../src/core/public';
import { SharedMessagePollingService } from './shared_message_polling_service';

export class PERAgentMessageService {
  private _message$ = new BehaviorSubject<unknown>(null);
  private _subscription?: Subscription;
  private _sharedPollingService: SharedMessagePollingService;

  constructor(private _http: CoreStart['http'], private _memoryContainerId: string) {
    this._sharedPollingService = SharedMessagePollingService.getInstance(_http);
  }

  setup({ dataSourceId, messageId }: { dataSourceId?: string; messageId: string }) {
    if (this._subscription && !this._subscription.closed) {
      return;
    }

    const pollingObservable = this._sharedPollingService.poll({
      memoryContainerId: this._memoryContainerId,
      messageId,
      dataSourceId,
      pollInterval: 5000,
    });

    this._subscription = pollingObservable.subscribe({
      next: (message) => {
        this._message$.next(message);
      },
      error: () => {
        this.stop();
      },
    });
  }

  stop() {
    this._subscription?.unsubscribe();
    this._message$.next(null);
  }

  getMessageValue = () => this._message$.getValue();
}
