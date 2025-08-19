/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiSmallButtonIcon,
} from '@elastic/eui';
import { InputType } from './types';
import { useInputContext } from './input_context';

interface InputTypeSelectorProps {
  allowSelect: boolean;
  current: InputType;
  onInputTypeChange: (type: InputType) => void;
}

export const InputTypeSelector: React.FC<InputTypeSelectorProps> = ({
  allowSelect,
  current,
  onInputTypeChange,
}) => {
  const { isLoading, isParagraph, paragraphOptions } = useInputContext();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isDisabled = isLoading || isParagraph;

  const onButtonClick = () => !isDisabled && setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  const handlePopoverItemClick = (typeId: InputType) => {
    onInputTypeChange(typeId);
    closePopover();
  };

  const icon = paragraphOptions.find((type) => type.key === current)?.icon || 'pencil';

  return (
    <EuiPopover
      button={
        <EuiSmallButtonIcon
          aria-label="input type icon button"
          iconType={icon}
          onClick={onButtonClick}
          disabled={!allowSelect}
          color={allowSelect ? 'primary' : 'text'}
          isDisabled={isDisabled}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
      repositionOnScroll
      panelPaddingSize="none"
      panelStyle={{ borderRadius: 8 }}
    >
      <EuiListGroup>
        {paragraphOptions.map(({ key, label, icon: iconType }) => (
          <EuiListGroupItem
            id={key}
            autoFocus={current === key}
            onClick={() => {
              handlePopoverItemClick(key as InputType);
            }}
            size="s"
            label={label}
            color="text"
            icon={<EuiIcon aria-label={`${label} button`} type={iconType} size="m" />}
          />
        ))}
      </EuiListGroup>
    </EuiPopover>
  );
};
