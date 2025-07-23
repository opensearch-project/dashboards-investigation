/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject } from 'rxjs';

export class ObservableState<TValue = {}> {
  private value$: BehaviorSubject<TValue>;
  constructor(initialValue: TValue) {
    this.value$ = new BehaviorSubject<TValue>(initialValue);
  }

  protected get value() {
    return this.value$.getValue();
  }

  updateValue(value: Partial<TValue>) {
    this.value$.next({
      ...this.value$.getValue(),
      ...value,
    });

    return this;
  }
  protected getValue() {
    return this.value;
  }
  protected getValue$() {
    return this.value$.pipe();
  }
  destroy() {
    this.value$.unsubscribe();
    this.value$.complete();
  }
}
