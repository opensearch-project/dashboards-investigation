/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { NoteBookServices } from 'public/types';
import {
  EuiButton,
  EuiCallOut,
  EuiMarkdownFormat,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { mountReactNode } from '../../../../src/core/public/utils';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { OverlayStart } from '../../../../src/core/public';

interface IShowErrorNotification {
  title: string;
  error: Error;
}

export const useToast = () => {
  const {
    services: { notifications, overlays, uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();

  return {
    addError: useCallback(
      (props: IShowErrorNotification) => {
        notifications.toasts.addDanger({
          toastLifeTimeMs: uiSettings.get('notifications:lifetime:error'),
          title: props.title,
          text: mountReactNode(
            <React.Fragment>
              <p data-test-subj="errorToastMessage">{props.error.message}</p>
              <div className="eui-textRight">
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={() =>
                    showErrorDialog({
                      title: props.title,
                      error: props.error,
                      openModal: overlays.openModal,
                    })
                  }
                >
                  {i18n.translate('core.toasts.errorToast.seeFullError', {
                    defaultMessage: 'See the full error',
                  })}
                </EuiButton>
              </div>
            </React.Fragment>
          ),
        });
      },
      [uiSettings, notifications, overlays]
    ),
  };
};

const mount = (component: React.ReactElement) => (container: HTMLElement) => {
  ReactDOM.render(component, container);
  return () => ReactDOM.unmountComponentAtNode(container);
};

function showErrorDialog({
  title,
  error,
  openModal,
}: IShowErrorNotification & { openModal: OverlayStart['openModal'] }) {
  const modal = openModal(
    mount(
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiCallOut size="s" color="danger" iconType="alert" title={error.message} />
          {error.cause && (
            <React.Fragment>
              <EuiSpacer size="s" />
              <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
                <EuiMarkdownFormat>{error.cause as string}</EuiMarkdownFormat>
              </EuiPanel>
            </React.Fragment>
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiSmallButton onClick={() => modal.close()} fill>
            {i18n.translate('core.notifications.errorToast.closeModal', {
              defaultMessage: 'Close',
            })}
          </EuiSmallButton>
        </EuiModalFooter>
      </React.Fragment>
    )
  );
}
