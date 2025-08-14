/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphBackendType } from 'common/types/notebooks';
import { OpenSearchClient } from '../../../../src/core/server';

export interface ParagraphRegistryItem<TOutput = unknown> {
  getContext: (props: {
    paragraph: ParagraphBackendType<TOutput>;
    transport: OpenSearchClient['transport'];
  }) => Promise<string>;
}

export interface ParagraphServiceSetup {
  register: <T>(type: string, paragraph: ParagraphRegistryItem<T>) => void;
  getParagraphRegistry: (type: string) => ParagraphRegistryItem | undefined;
}

export class ParagraphService {
  private paragraphMap: Map<string, ParagraphRegistryItem> = new Map<
    string,
    ParagraphRegistryItem
  >();
  setup = (): ParagraphServiceSetup => {
    const register = <T>(type: string, paragraph: ParagraphRegistryItem<T>) => {
      if (this.paragraphMap.get(type)) {
        console.error(`paragraph type ${type} has already been registered.`);
        return;
      }

      this.paragraphMap.set(type, paragraph as ParagraphRegistryItem);
    };
    const getParagraphRegistry = (type: string) => this.paragraphMap.get(type);
    return {
      register,
      getParagraphRegistry,
    };
  };
}
