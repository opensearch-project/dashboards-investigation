/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { CustomInputModal } from '../custom_input_modal';
import { NotebookType } from '../../../../../../../common/types/notebooks';

describe('<CustomInputModal /> spec', () => {
  const defaultProps = {
    runModal: jest.fn(),
    closeModal: jest.fn(),
    labelTxt: 'Name',
    titletxt: 'Create notebook',
    btn1txt: 'Cancel',
    btn2txt: 'Create',
    openNoteName: '',
    helpText: 'Enter a name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    const { baseElement } = render(<CustomInputModal {...defaultProps} openNoteName="mock-path" />);
    expect(baseElement).toMatchSnapshot();

    const { baseElement: emptyNameBaseElement } = render(<CustomInputModal {...defaultProps} />);
    expect(emptyNameBaseElement).toMatchSnapshot();
  });

  it('handles input changes', () => {
    const { getByTestId } = render(<CustomInputModal {...defaultProps} />);
    const input = getByTestId('custom-input-modal-input');

    fireEvent.change(input, { target: { value: 'test-name' } });
    expect(input).toHaveValue('test-name');
  });

  it('calls runModal with correct parameters on submit', () => {
    const runModal = jest.fn();
    const { getByTestId } = render(
      <CustomInputModal {...defaultProps} runModal={runModal} notebookType={NotebookType.CLASSIC} />
    );

    fireEvent.change(getByTestId('custom-input-modal-input'), {
      target: { value: 'test-name' },
    });
    fireEvent.click(getByTestId('custom-input-modal-confirm-button'));

    expect(runModal).toHaveBeenCalledWith('test-name', NotebookType.CLASSIC);
  });

  it('shows empty validation error', async () => {
    const runModal = jest.fn();
    const { getByTestId, getByText } = render(
      <CustomInputModal {...defaultProps} runModal={runModal} />
    );

    // Try to submit with empty input
    fireEvent.click(getByTestId('custom-input-modal-confirm-button'));

    await waitFor(() => {
      expect(getByText('Name is required')).toBeInTheDocument();
    });
    expect(runModal).not.toHaveBeenCalled();
  });

  it('shows length validation error', async () => {
    const runModal = jest.fn();
    const { getByTestId, getByText } = render(
      <CustomInputModal {...defaultProps} runModal={runModal} maxLength={10} />
    );

    // Enter text longer than maxLength
    fireEvent.change(getByTestId('custom-input-modal-input'), {
      target: { value: 'this is too long' },
    });

    await waitFor(() => {
      expect(getByText('Name must be 10 characters or less')).toBeInTheDocument();
    });
  });

  it('clears empty error when user starts typing', async () => {
    const { getByTestId, getByText, queryByText } = render(<CustomInputModal {...defaultProps} />);

    // Trigger empty error
    fireEvent.click(getByTestId('custom-input-modal-confirm-button'));
    await waitFor(() => {
      expect(getByText('Name is required')).toBeInTheDocument();
    });

    // Start typing
    fireEvent.change(getByTestId('custom-input-modal-input'), {
      target: { value: 'test' },
    });

    await waitFor(() => {
      expect(queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  it('calls closeModal when cancel button is clicked', () => {
    const closeModal = jest.fn();
    const { getByText } = render(<CustomInputModal {...defaultProps} closeModal={closeModal} />);

    fireEvent.click(getByText('Cancel'));
    expect(closeModal).toHaveBeenCalled();
  });

  it('uses default maxLength of 50', () => {
    const { getByTestId, getByText } = render(<CustomInputModal {...defaultProps} />);

    // Enter text longer than 50 characters
    const longText = 'a'.repeat(51);
    fireEvent.change(getByTestId('custom-input-modal-input'), {
      target: { value: longText },
    });

    expect(getByText('Name must be 50 characters or less')).toBeInTheDocument();
  });

  it('handles whitespace-only input as empty', async () => {
    const runModal = jest.fn();
    const { getByTestId, getByText } = render(
      <CustomInputModal {...defaultProps} runModal={runModal} />
    );

    // Enter only whitespace
    fireEvent.change(getByTestId('custom-input-modal-input'), {
      target: { value: '   ' },
    });
    fireEvent.click(getByTestId('custom-input-modal-confirm-button'));

    await waitFor(() => {
      expect(getByText('Name is required')).toBeInTheDocument();
    });
    expect(runModal).not.toHaveBeenCalled();
  });
});
