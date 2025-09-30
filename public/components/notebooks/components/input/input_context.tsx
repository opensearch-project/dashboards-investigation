/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { useObservable } from 'react-use';
import type { monaco } from '@osd/monaco';
import { EuiSelectableOption } from '@elastic/eui';
import { NotebookType, ParagraphInputType } from '../../../../../common/types/notebooks';
// import { useAgentSelectSubmit } from './use_agent_select_submit';
import { InputType, QueryState, InputValueType, InputTypeOption } from './types';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import { NotebookReactContext } from '../../context_provider/context_provider';

interface InputContextValue<T extends InputType = InputType> {
  // States
  // Current input variant type
  currInputType: T;

  // Input value from paragraph component, initially undefined in the input panel
  inputValue: InputValueType<T> | undefined;

  // Open selectable popover for creating blank input TODO: if can be removed
  isParagraphSelectionOpen: boolean;

  // Ref for text area, use for auto resizing
  textareaRef: React.RefObject<HTMLTextAreaElement>;

  // If the input submit is triggered and is loading
  isLoading: boolean;

  // If the input is located in an exising paragraph but not in input panel
  isInputMountedInParagraph: boolean;

  // All the availble paragraph options that are used to determine input variant
  paragraphOptions: InputTypeOption[];

  // Data source ID from notebook context
  dataSourceId: string | undefined;

  // Input object from paragraph
  paragraphInput: ParagraphInputType<T> | undefined;

  // Notebook type, agentic or classic
  isAgenticNotebook: boolean;

  // Actions
  // Update the current state of input variant type
  handleSetCurrInputType: (type: T) => void;

  // Update the selectable popover TODO: if can be removed
  setIsParagraphSelectionOpen: (open: boolean) => void;

  // Update the user input value
  handleInputChange: (value: Partial<InputValueType<T>>) => void;

  // Cancel button on the input panel TODO: do we really need this?
  handleCancel: () => void;

  // Submit and execute the current input state
  handleSubmit: (inputText?: string, parameters?: unknown, dataSourceId?: string) => void;

  // Handle open the popover for creating blank
  handleParagraphSelection: (options: EuiSelectableOption[]) => void;

  // For query editor
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  editorTextRef: React.MutableRefObject<string>;
}

const InputContext = createContext<InputContextValue | undefined>(undefined);

interface InputProviderProps<TParameters = unknown> {
  children: ReactNode;
  onSubmit: (input: ParagraphInputType<TParameters>, dataSourceId?: string) => void;
  input?: ParagraphInputType<TParameters>;
  dataSourceId?: string;
  aiFeatureEnabled?: boolean;
}

export const InputProvider: React.FC<InputProviderProps> = ({
  children,
  onSubmit,
  input,
  dataSourceId = undefined,
  aiFeatureEnabled,
}) => {
  const [currInputType, setCurrInputType] = useState<InputType>(
    (input?.inputType as InputType) || (aiFeatureEnabled ? AI_RESPONSE_TYPE : 'PPL')
  );

  const getInitialInputValue = () => {
    if (!input?.inputText) return undefined;

    if (input.inputType === 'PPL' || input.inputType === 'SQL') {
      return undefined;
    }

    return input.inputText as InputValueType<typeof currInputType>;
  };

  const [inputValue, setInputValue] = useState<InputValueType<typeof currInputType> | undefined>(
    getInitialInputValue()
  );
  const [isParagraphSelectionOpen, setIsParagraphSelectionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorTextRef = useRef(input?.inputText ? input?.inputText : '');

  const handleInputChange = useCallback((value: Partial<InputValueType<typeof currInputType>>) => {
    if (typeof value === 'object') {
      // For query types, support object updates
      setInputValue((prev) => ({ ...(prev as QueryState), ...value }));
    } else {
      setInputValue(value as string);
    }

    // Only check for % trigger on string values
    if (typeof value === 'string' && value.endsWith('%')) {
      setIsParagraphSelectionOpen(true);
    } else {
      setIsParagraphSelectionOpen(false);
    }
  }, []);

  const context = useContext(NotebookReactContext);
  const { initialGoal, notebookType } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );

  const paragraphOptions = useMemo(
    () =>
      [
        {
          key: AI_RESPONSE_TYPE,
          icon: 'chatLeft',
          label: 'Ask AI',
          'data-test-subj': 'paragraph-type-nl',
          disabled: !aiFeatureEnabled,
        },
        { key: 'PPL', icon: 'compass', label: 'Query', 'data-test-subj': 'paragraph-type-ppl' },
        {
          key: DEEP_RESEARCH_PARAGRAPH_TYPE,
          icon: 'generate',
          label: 'Continue investigation',
          'data-test-subj': 'paragraph-type-deep-research',
          disabled: !initialGoal || !aiFeatureEnabled,
        },
        {
          key: 'MARKDOWN',
          icon: 'pencil',
          label: 'Note',
          'data-test-subj': 'paragraph-type-markdown',
        },
        {
          label: 'Visualization',
          key: 'VISUALIZATION',
          icon: 'lineChart',
          'data-test-subj': 'paragraph-type-visualization',
        },
      ].filter((item) => !item.disabled),
    [initialGoal, aiFeatureEnabled]
  );

  const handleCancel = useCallback(() => {
    setInputValue('');
    setCurrInputType(aiFeatureEnabled ? AI_RESPONSE_TYPE : 'PPL');
  }, [aiFeatureEnabled]);

  // const { handleAgentSelectSubmit } = useAgentSelectSubmit({
  //   http,
  //   dataSourceId,
  //   onSubmit,
  //   setIsLoading,
  // });

  const handleParagraphSelection = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedOption = options.find((option) => option.checked === 'on');
      if (selectedOption) {
        const paragraphType = selectedOption.key as InputType;

        // Create empty paragraph
        onSubmit({ inputText: '', inputType: paragraphType });

        setIsParagraphSelectionOpen(false);
        handleInputChange('');
        handleCancel();
      }
    },
    [onSubmit, handleInputChange, handleCancel]
  );

  const isInputMountedInParagraph = !!input;
  const isAgenticNotebook = notebookType === NotebookType.AGENTIC;

  const handleSubmit = useCallback(
    async (inputText?: string, parameters?: any, dsId?: string) => {
      if (!inputValue && !inputText) {
        return;
      }

      setIsLoading(true);

      try {
        onSubmit(
          {
            inputText: inputText ?? (inputValue as string),
            inputType: currInputType,
            ...(parameters ? { parameters } : {}),
          },
          isAgenticNotebook ? undefined : dsId
        );

        if (!isInputMountedInParagraph) handleCancel();
      } catch (err) {
        console.log('error while execute the input', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputValue,
      currInputType,
      onSubmit,
      isInputMountedInParagraph,
      handleCancel,
      isAgenticNotebook,
    ]
  );

  const handleSetCurrInputType = useCallback((type: InputType) => {
    setCurrInputType(type);
  }, []);

  const value: InputContextValue = {
    currInputType,
    inputValue,
    isParagraphSelectionOpen,
    textareaRef,
    editorRef,
    editorTextRef,
    isLoading,
    isInputMountedInParagraph,
    paragraphOptions,
    dataSourceId,
    paragraphInput: input,
    isAgenticNotebook,
    handleSetCurrInputType,
    setIsParagraphSelectionOpen,
    handleInputChange,
    handleCancel,
    handleSubmit,
    handleParagraphSelection,
  };

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
};

export const useInputContext = () => {
  const context = useContext(InputContext);
  if (context === undefined) {
    throw new Error('useInputContext must be used within an InputProvider');
  }
  return context;
};
