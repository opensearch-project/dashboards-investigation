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
import { investigationNotebookID } from '../../common/constants/shared';
import { isAnalyticEngineDataSource } from '../utils/data_source_utils';

export const ACTION_START_INVESTIGATION = 'startInvestigationAction';

interface ActionContext {
  embeddable: IEmbeddable & { savedExplore: { visualization: string } };
}

export class StartInvestigationAction implements Action<ActionContext> {
  public readonly type = ACTION_START_INVESTIGATION;
  public readonly id = ACTION_START_INVESTIGATION;
  public order = 25; // Position in the menu
  private currentAppId: string | undefined = '';

  constructor(
    private readonly overlay: OverlayStart,
    private readonly services: StartInvestigateModalDedentServices
  ) {
    this.services.application.currentAppId$.subscribe((appId) => {
      this.currentAppId = appId;
    });
  }

  public getDisplayName() {
    return i18n.translate('investigation.panel.startInvestigation.displayName', {
      defaultMessage: 'Start investigation',
    });
  }

  public getIconType(): EuiIconType {
    return 'notebookApp';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isExplore = embeddable.type === 'explore';
    // Show for new discover visualizations
    // and not show the `start investigation` action in notebook.
    if (!(isExplore && this.currentAppId !== investigationNotebookID)) {
      return false;
    }

    let hasTransformation = false;
    try {
      const visualizationObject = JSON.parse(embeddable.savedExplore.visualization) as {
        dataTransformations?: [];
      };
      hasTransformation = !!visualizationObject.dataTransformations?.length;
    } catch (_e) {
      console.warn('Invalid visualization string');
    }

    if (hasTransformation) {
      return false;
    }
    // Hide for AnalyticEngine data sources
    const visEmbeddable = embeddable as DiscoverVisualizationEmbeddable;
    const dsType = visEmbeddable.savedExplore?.searchSource?.getFields()?.query?.dataset?.dataSource
      ?.type;
    if (isAnalyticEngineDataSource(dsType)) return false;
    return true;
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
