/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { Action } from '../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../src/plugins/embeddable/public';
import { OverlayStart } from '../../../../src/core/public';
import { toMountPoint } from '../../../../src/plugins/opensearch_dashboards_react/public';
import {
  DiscoverVisualizationEmbeddable,
  StartInvestigationFromDiscoverVisualizationComponent,
} from './start_investigation_from_discover_visualization_component';
import { StartInvestigateModalDedentServices } from '../components/notebooks/components/discover_explorer/start_investigation_modal';

export const ACTION_START_INVESTIGATION = 'startInvestigationAction';

interface ActionContext {
  embeddable: IEmbeddable;
}

export class StartInvestigationAction implements Action<ActionContext> {
  public readonly type = ACTION_START_INVESTIGATION;
  public readonly id = ACTION_START_INVESTIGATION;
  public order = 25; // Position in the menu

  constructor(
    private readonly overlay: OverlayStart,
    private readonly services: StartInvestigateModalDedentServices
  ) {}

  public getDisplayName() {
    return i18n.translate('investigation.panel.startInvestigation.displayName', {
      defaultMessage: 'Start investigation',
    });
  }

  public getIconType(): EuiIconType {
    return 'notebookApp';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    // Show for new discover visualizations
    return embeddable.type === 'explore';
  }

  public async execute({ embeddable }: ActionContext) {
    const overlayRef = this.overlay.openModal(
      toMountPoint(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={embeddable as DiscoverVisualizationEmbeddable}
          services={this.services}
          onClose={() => overlayRef.close()}
        />
      ),
      {
        'data-test-subj': 'startInvestigationModal',
      }
    );
  }
}
