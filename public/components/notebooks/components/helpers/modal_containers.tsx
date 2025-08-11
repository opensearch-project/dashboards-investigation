/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiConfirmModal,
  EuiForm,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSwitch,
} from '@elastic/eui';
import React, { useState } from 'react';
import { CoreStart, SavedObjectsStart } from '../../../../../../../src/core/public';
import { dataSourceFilterFn } from '../../../../../common/utils/shared';
import { CustomInputModal } from './custom_modals/custom_input_modal';
import { getDataSourceManagementSetup } from '../../../../../public/services';
import { DataSourceOption } from '../../../../../../../src/plugins/data_source_management/public';
import { NotebookType } from '../../../../../common//types/notebooks';

/* The file contains helper functions for modal layouts
 * getCustomModal - returns modal with input field
 * getCloneModal - returns a confirm-modal with clone option
 * getDeleteModal - returns a confirm-modal with delete option
 */

export const getCustomModal = (
  runModal: (value: string) => void,
  closeModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void,
  labelTxt: string,
  titletxt: string,
  btn1txt: string,
  btn2txt: string,
  openNoteName?: string,
  helpText?: string
) => {
  return (
    <CustomInputModal
      runModal={runModal}
      closeModal={closeModal}
      labelTxt={labelTxt}
      titletxt={titletxt}
      btn1txt={btn1txt}
      btn2txt={btn2txt}
      openNoteName={openNoteName!}
      helpText={helpText!}
    />
  );
};

export const getCloneModal = (
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void,
  onConfirm: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title="Clone Notebook"
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Yes"
        defaultFocusedButton="confirm"
      >
        <p>Do you want to clone this notebook?</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const getSampleNotebooksModal = (
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void,
  onConfirm: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void,
  dataSourceEnabled: boolean,
  savedObjectsMDSClient: SavedObjectsStart,
  notifications: CoreStart['notifications'],
  handleSelectedDataSourceChange: (
    dataSourceMDSId: string | undefined,
    dataSourceMDSLabel: string | undefined
  ) => void
) => {
  const { dataSourceManagement } = getDataSourceManagementSetup();
  let DataSourceSelector;
  const onSelectedDataSource = (dsOption: DataSourceOption[]) => {
    const dataConnectionId = dsOption[0] ? dsOption[0].id : undefined;
    const dataConnectionLabel = dsOption[0] ? dsOption[0].label : undefined;
    handleSelectedDataSourceChange(dataConnectionId, dataConnectionLabel);
  };

  if (dataSourceEnabled) {
    DataSourceSelector = dataSourceManagement?.ui.DataSourceSelector;
  }
  if (!DataSourceSelector) {
    return null;
  }
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title="Add sample notebooks"
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Yes"
        defaultFocusedButton="confirm"
      >
        {dataSourceEnabled && (
          <>
            <EuiTitle size="s">
              <h4>Select a Data source</h4>
            </EuiTitle>
            <DataSourceSelector
              savedObjectsClient={savedObjectsMDSClient.client}
              notifications={notifications.toasts}
              onSelectedDataSource={onSelectedDataSource}
              disabled={false}
              fullWidth={false}
              removePrepend={false}
              dataSourceFilter={dataSourceFilterFn}
            />
          </>
        )}
        <EuiSpacer />
        <p>
          Do you want to add sample notebooks? This will also add Dashboards sample flights and logs
          data if they have not been added.
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const getDeleteModal = (
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void,
  onConfirm: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void,
  title: string,
  message: string,
  confirmMessage?: string
) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText={confirmMessage || 'Delete'}
        buttonColor="danger"
        defaultFocusedButton="confirm"
      >
        <EuiText size="s">{message}</EuiText>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const DeleteNotebookModal = ({
  onCancel,
  onConfirm,
  title,
  message,
}: {
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  onConfirm: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  title: string;
  message: string;
}) => {
  const [value, setValue] = useState('');
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };
  return (
    <EuiOverlayMask>
      <EuiModal onClose={onCancel} initialFocus="[name=input]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>{title}</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText size="s">{message}</EuiText>
          <EuiText size="s">The action cannot be undone.</EuiText>
          <EuiSpacer />
          <EuiForm>
            <EuiCompressedFormRow label={'To confirm deletion, enter "delete" in the text field'}>
              <EuiCompressedFieldText
                data-test-subj="delete-notebook-modal-input"
                name="input"
                placeholder="delete"
                value={value}
                onChange={(e) => onChange(e)}
              />
            </EuiCompressedFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiSmallButtonEmpty onClick={onCancel}>Cancel</EuiSmallButtonEmpty>
          <EuiSmallButton
            data-test-subj="delete-notebook-modal-delete-button"
            onClick={() => onConfirm()}
            color="danger"
            fill
            disabled={value !== 'delete'}
          >
            Delete
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

interface CreateNotebookModalProps {
  runModal: (name: string, notebookType: NotebookType) => void;
  closeModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  labelTxt: string;
  titletxt: string;
  btn1txt: string;
  btn2txt: string;
  openNoteName?: string;
  helpText?: string;
}

export const CreateNotebookModal = ({
  runModal,
  closeModal,
  labelTxt,
  titletxt,
  btn1txt,
  btn2txt,
  openNoteName,
  helpText,
}: CreateNotebookModalProps) => {
  const [value, setValue] = useState(openNoteName || ''); // sets input value
  const [checked, setChecked] = useState(true);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onToggle = (
    e: React.BaseSyntheticEvent<
      React.MouseEvent<HTMLButtonElement>,
      HTMLButtonElement,
      EventTarget & { checked: boolean }
    >
  ) => {
    setChecked(e.target.checked);
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
            <EuiCompressedFormRow label={labelTxt} helpText={helpText}>
              <EuiCompressedFieldText
                data-test-subj="custom-input-modal-input"
                name="input"
                value={value}
                onChange={(e) => onChange(e)}
              />
            </EuiCompressedFormRow>
            <EuiSpacer size="m" />
            <EuiCompressedFormRow label="Notebook Type">
              <EuiSwitch
                label={checked ? 'Agentic Notebook' : 'Classic Notebook'}
                checked={checked}
                onChange={(e) => onToggle(e)}
              />
            </EuiCompressedFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiSmallButtonEmpty onClick={closeModal}>{btn1txt}</EuiSmallButtonEmpty>
          <EuiSmallButton
            data-test-subj="custom-input-modal-confirm-button"
            onClick={() => runModal(value, checked ? NotebookType.AGENTIC : NotebookType.CLASSIC)}
            fill
          >
            {btn2txt}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
