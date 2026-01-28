/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiSmallButtonEmpty,
  EuiForm,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiCompressedFormRow,
  EuiCompressedFieldText,
  EuiSmallButton,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { NotebookType } from '../../../../../../common/types/notebooks';

/*
 * "CustomInputModalProps" component is used to create a modal with an input filed
 *
 * Props taken in as params are:
 * runModal - function to fetch input field value and trigger closing modal
 * closeModal - function to trigger closing modal
 * titletxt - string as header for title of modal
 * labelTxt - string as header for input field
 * btn1txt - string as content to fill "close button"
 * btn2txt - string as content to fill "confirm button"
 * openNoteName - Default input value for the field
 */
interface CustomInputModalProps {
  runModal: (value: string, notebookType?: any) => void;
  closeModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  labelTxt: string;
  titletxt: string;
  btn1txt: string;
  btn2txt: string;
  openNoteName: string;
  helpText: string;
  maxLength?: number;
  notebookType?: NotebookType;
}

export const CustomInputModal = (props: CustomInputModalProps) => {
  const {
    runModal,
    closeModal,
    labelTxt,
    titletxt,
    btn1txt,
    btn2txt,
    openNoteName,
    helpText,
    maxLength = 50,
    notebookType,
  } = props;
  const [value, setValue] = useState(openNoteName || ''); // sets input value
  const [showEmptyError, setShowEmptyError] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (showEmptyError && e.target.value.trim()) {
      setShowEmptyError(false);
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) {
      setShowEmptyError(true);
      return;
    }
    runModal(value, notebookType);
  };

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal} initialFocus="[name=input]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>{titletxt}</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiForm>
            <EuiCompressedFormRow
              label={labelTxt}
              helpText={helpText}
              isInvalid={value.length > maxLength || showEmptyError}
              error={
                showEmptyError
                  ? i18n.translate('investigate.customInputModal.nameRequired', {
                      defaultMessage: 'Name is required',
                    })
                  : value.length > maxLength
                  ? i18n.translate('investigate.customInputModal.nameTooLong', {
                      defaultMessage: 'Name must be {maxLength} characters or less',
                      values: { maxLength },
                    })
                  : undefined
              }
            >
              <EuiCompressedFieldText
                data-test-subj="custom-input-modal-input"
                name="input"
                value={value}
                onChange={(e) => onChange(e)}
              />
            </EuiCompressedFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiSmallButtonEmpty onClick={closeModal}>{btn1txt}</EuiSmallButtonEmpty>
          <EuiSmallButton
            data-test-subj="custom-input-modal-confirm-button"
            onClick={handleSubmit}
            fill
          >
            {btn2txt}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
