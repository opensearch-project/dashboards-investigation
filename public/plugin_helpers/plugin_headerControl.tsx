/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NoteBookServices } from 'public/types';
import {
  TopNavControlLinkData,
  TopNavControlButtonData,
} from '../../../../src/plugins/navigation/public';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';

interface DescriptionWithOptionalLink {
  text: string;
  url?: string;
  urlTitle?: string;
}

interface HeaderControlledComponentsWrapperProps {
  components?: Array<TopNavControlButtonData | TopNavControlLinkData | React.ReactElement>;
  badgeContent?: React.ReactElement | string | number;
  description?: string | DescriptionWithOptionalLink;
}

const renderHeaderComponent = (
  component: TopNavControlButtonData | TopNavControlLinkData | React.ReactElement
) => {
  if (React.isValidElement(component)) {
    return {
      renderComponent: component,
    };
  }

  switch ((component as TopNavControlButtonData | TopNavControlLinkData).controlType) {
    case 'button': {
      const buttonData = component as TopNavControlButtonData;
      return {
        label: buttonData.label,
        run: buttonData.run,
        fill: buttonData.fill,
        color: buttonData.color,
        iconType: buttonData.iconType,
        iconSide: buttonData.iconSide,
        controlType: 'button',
      };
    }
    case 'link': {
      const linkData = component as TopNavControlLinkData;
      return {
        label: linkData.label,
        href: linkData.href,
        target: linkData.target,
        controlType: 'link',
      };
    }
    default:
      return {};
  }
};

export const HeaderControlledComponentsWrapper = ({
  components = [],
  badgeContent,
  description,
}: HeaderControlledComponentsWrapperProps) => {
  const {
    services: { navigation, chrome, application },
  } = useOpenSearchDashboards<NoteBookServices>();

  const HeaderControl = navigation.ui.HeaderControl;
  const showActionsInHeader = chrome.navGroup.getNavGroupEnabled();

  const isBadgeReactElement = React.isValidElement(badgeContent);

  return (
    <>
      {badgeContent && (
        <>
          {showActionsInHeader && HeaderControl ? (
            <HeaderControl
              setMountPoint={application.setAppBadgeControls}
              controls={[
                {
                  renderComponent: isBadgeReactElement ? (
                    <span>{badgeContent}</span>
                  ) : (
                    <span>{`(${badgeContent})`}</span>
                  ),
                },
              ]}
            />
          ) : (
            <span>{isBadgeReactElement ? badgeContent : `(${badgeContent})`}</span>
          )}
        </>
      )}

      {description && (
        <>
          {showActionsInHeader && HeaderControl ? (
            <HeaderControl
              setMountPoint={application.setAppDescriptionControls}
              controls={[
                {
                  description: typeof description === 'string' ? description : description.text,
                  ...(typeof description === 'object' && description.url
                    ? {
                        links: [
                          ({
                            label: description.urlTitle || 'Learn more',
                            href: description.url || '#',
                            target: '_blank',
                            controlType: 'link',
                            flush: true,
                          } as unknown) as TopNavControlLinkData,
                        ],
                      }
                    : {}),
                },
              ]}
            />
          ) : (
            <p>{typeof description === 'string' ? description : description.text}</p>
          )}
        </>
      )}

      {components.length > 0 && (
        <>
          {showActionsInHeader && HeaderControl ? (
            <HeaderControl
              setMountPoint={application.setAppRightControls}
              controls={components.map((component) => renderHeaderComponent(component))}
            />
          ) : (
            <div>
              {components.map((component) =>
                React.isValidElement(component) ? (
                  <span>{component}</span>
                ) : (
                  <span>{(component as TopNavControlButtonData).label}</span>
                )
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};
