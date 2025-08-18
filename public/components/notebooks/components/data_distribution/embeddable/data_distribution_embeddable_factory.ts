/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';

import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../../../src/plugins/embeddable/public';
import { DataDistributionEmbeddable } from './data_distribution_embeddable';
import { DataDistributionInput } from './types';

export class DataDistributionEmbeddableFactory implements EmbeddableFactoryDefinition {
  public readonly type = 'vega_visualization';

  public async isEditable() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('vega.displayName', {
      defaultMessage: 'Vega visualization',
    });
  }

  public async create(input: DataDistributionInput, parent?: IContainer) {
    return new DataDistributionEmbeddable(input, parent);
  }
}
