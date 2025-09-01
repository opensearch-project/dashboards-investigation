/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiMarkdownEditor,
  EuiSpacer,
} from '@elastic/eui';
import { useInputContext } from '../input_context';

export const MarkDownInput: React.FC = () => {
  const {
    textareaRef,
    inputValue,
    handleInputChange,
    handleSubmit,
    handleCancel,
  } = useInputContext();

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = inputValue as string;
    }
  }, [inputValue, textareaRef]);

  useEffect(() => {
    handleInputChange('');
  }, [handleInputChange]);

  const onParse = useCallback((err, { messages: msgs }) => {
    setMessages(err ? [err] : msgs);
  }, []);

  return (
    <>
      <EuiMarkdownEditor
        aria-label="Notebook markdown"
        value={inputValue as string}
        onChange={handleInputChange}
        height={200}
        onParse={onParse}
        errors={messages}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="none" dir="row" justifyContent="flexEnd" style={{ gap: 4 }}>
        <EuiButtonEmpty color="primary" onClick={handleCancel} size="s">
          Cancel
        </EuiButtonEmpty>
        <EuiButton color="primary" fill onClick={() => handleSubmit()} size="s">
          Save
        </EuiButton>
      </EuiFlexGroup>
    </>
  );
};
