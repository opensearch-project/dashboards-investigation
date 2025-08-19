/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { useObservable } from 'react-use';
import type { monaco } from '@osd/monaco';
import { NoteBookServices } from 'public/types';
import { EuiSelectableOption } from '@elastic/eui';
import { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import { InputType, QueryLanguage, QueryState, InputValueType, InputTypeOption } from './types';
import { useInputSubmit } from './use_input_submit';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useParagraphs } from '../../../../../public/hooks/use_paragraphs';
import {
  QueryAssistParameters,
  QueryAssistResponse,
} from '../../../../../../../src/plugins/query_enhancements/common/query_assist';

const TIME_FILTER_QUERY_REGEX = /\s*\|\s*WHERE\s+`[^`]+`\s*>=\s*'[^']+'\s*AND\s*`[^`]+`\s*<=\s*'[^']+'/i;

const TIME_FILTER_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

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
  isParagraph: boolean;

  paragraphOptions: InputTypeOption[];

  // Actions
  // Update the current state of input variant type
  setCurrInputType: (type: InputType) => void;

  // Update the selectable popover TODO: if can be removed
  setIsPopoverOpen: (open: boolean) => void;

  // Update the user input value
  handleInputChange: (value: Partial<InputValueType<T>>) => void;

  // Cancel button on the input panel TODO: do we really need this?
  handleCancel: () => void;

  // Submit and execute the current input state
  handleSubmit: (payload?: any) => void;

  // Handle open the popover for creating blank
  handleParagraphSelection: (options: EuiSelectableOption[]) => Promise<void>;

  // For query editor
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  editorTextRef: React.MutableRefObject<string>;
  dataView: any;
  setDataView: (view: any) => void;
}

const InputContext = createContext<InputContextValue | undefined>(undefined);

interface InputProviderProps {
  children: ReactNode;
  onSubmit?: (paragraphInput: string, inputType: string) => void;
  input?: { inputText: string; inputType: string };
}

export const InputProvider: React.FC<InputProviderProps> = ({ children, onSubmit, input }) => {
  const {
    services: { http, data },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { createParagraph } = useParagraphs();
  const paragraphs = useObservable(
    useContext(NotebookReactContext).state.getValue$(),
    useContext(NotebookReactContext).state.value
  ).paragraphs.map((item) => item.value);

  const [currInputType, setCurrInputType] = useState<InputType>(
    (input?.inputType as InputType) || AI_RESPONSE_TYPE
  );

  const getInitialInputValue = () => {
    if (!input?.inputText) return undefined;

    if (input.inputType === 'PPL' || input.inputType === 'SQL') {
      // FIXME: remove this when the executing of a query is properly implemented
      const cleanedQuery = input.inputText.replace(TIME_FILTER_QUERY_REGEX, '');

      return {
        value: cleanedQuery,
        query: '',
        queryLanguage: input.inputType as QueryLanguage,
        isPromptEditorMode: false, // FIXME
        timeRange: { start: 'now-15m', end: 'now' },
        selectedIndex: data.query.queryString.getDefaultQuery().dataset, // FIXME
      } as InputValueType<typeof currInputType>;
    }

    return input.inputText as InputValueType<typeof currInputType>;
  };

  const [inputValue, setInputValue] = useState<InputValueType<typeof currInputType> | undefined>(
    getInitialInputValue()
  );
  const [isParagraphSelectionOpen, setIsParagraphSelectionOpen] = useState(false);
  const [dataView, setDataView] = useState<any>(undefined);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorTextRef = useRef(
    typeof inputValue === 'object' && inputValue?.value
      ? inputValue.value
      : (inputValue as string) || ''
  );

  const handleInputChange = (value: Partial<InputValueType<typeof currInputType>>) => {
    if (currInputType === 'PPL' || currInputType === 'SQL') {
      // For query types, support partial updates
      if (typeof value === 'object' && value !== null && !('queryLanguage' in value)) {
        // Partial update
        setInputValue((prev) => ({ ...(prev as QueryState), ...value }));
      } else {
        // Full replacement
        setInputValue(value as QueryState);
      }
    } else {
      setInputValue(value as string);
    }

    // Only check for % trigger on string values
    if (typeof value === 'string' && value.endsWith('%')) {
      setIsParagraphSelectionOpen(true);
    } else if (isParagraphSelectionOpen) {
      setIsParagraphSelectionOpen(false);
    }
  };

  const context = useContext(NotebookReactContext);
  const { dataSourceId, initialGoal } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );

  const paragraphOptions = [
    {
      key: AI_RESPONSE_TYPE,
      icon: 'chatLeft',
      label: 'Ask AI',
      'data-test-subj': 'paragraph-type-nl',
    },
    { key: 'PPL', icon: 'compass', label: 'Query', 'data-test-subj': 'paragraph-type-ppl' },
    {
      key: 'DEEP_RESEARCH_AGENT',
      icon: 'generate',
      label: 'Continue investigation',
      'data-test-subj': 'paragraph-type-deep-research',
      disabled: !initialGoal,
    },
    { key: 'MARKDOWN', icon: 'pencil', label: 'Note', 'data-test-subj': 'paragraph-type-markdown' },
    {
      label: 'Visualization',
      key: 'VISUALIZATION',
      icon: 'lineChart',
      'data-test-subj': 'paragraph-type-visualization',
    },
  ].filter((item) => !item.disabled);

  const handleCreateParagraph = async (paragraphInput: string | object, inputType: string) => {
    // Add paragraph at the end
    await createParagraph({
      index: paragraphs.length,
      input: {
        inputText:
          typeof paragraphInput === 'object' ? JSON.stringify(paragraphInput) : paragraphInput,
        inputType,
      },
    });
  };

  const { isLoading, onAskAISubmit } = useInputSubmit({
    http,
    dataSourceId,
    onSubmit: handleCreateParagraph,
  });

  const handleCancel = () => {
    setCurrInputType(AI_RESPONSE_TYPE);
  };

  const handleParagraphSelection = async (options: EuiSelectableOption[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    if (selectedOption) {
      const paragraphType = selectedOption.key as InputType;

      // Determine paragraph type and input content
      let inputType = 'CODE';
      let paragraphInput = '';

      switch (paragraphType) {
        case 'PPL':
          inputType = 'CODE';
          paragraphInput = '%ppl\n';
          break;
        case 'MARKDOWN':
          inputType = 'CODE';
          paragraphInput = '%md\n';
          break;
        case 'VISUALIZATION':
          inputType = 'VISUALIZATION';
          paragraphInput = '';
          break;
        case 'DEEP_RESEARCH_AGENT':
          inputType = DEEP_RESEARCH_PARAGRAPH_TYPE;
          paragraphInput = '';
          break;
        case AI_RESPONSE_TYPE:
          inputType = AI_RESPONSE_TYPE;
          paragraphInput = '';
          break;
        default:
          inputType = 'CODE';
          paragraphInput = '';
      }

      handleCreateParagraph(paragraphInput, inputType);

      setIsParagraphSelectionOpen(false);
      handleInputChange('');
      handleCancel();
    }
  };

  const isParagraph = !!input;

  const submitFn = isParagraph && onSubmit ? onSubmit : handleCreateParagraph;

  const calculateTimeFilterQuery = (
    query: string,
    timeRange: DurationRange,
    selectedIndex: any
  ) => {
    if (TIME_FILTER_QUERY_REGEX.test(query)) {
      return '';
    }
    // FIXME: remove this when the executing of a query is properly implemented
    const timeBounds = data.query.timefilter.timefilter.calculateBounds({
      from: timeRange?.start!,
      to: timeRange?.end!,
    });

    const timeFieldName = selectedIndex.timeFieldName;
    return timeFieldName
      ? ` | WHERE \`${timeFieldName}\` >= '${timeBounds.min!.format(
          TIME_FILTER_FORMAT
        )}' AND \`${timeFieldName}\` <= '${timeBounds.max!.format(TIME_FILTER_FORMAT)}'`
      : '';
  };

  const handleCallAgent = async () => {
    const { queryLanguage, timeRange, selectedIndex } = inputValue as QueryState;

    const params: QueryAssistParameters = {
      question: editorTextRef.current,
      index: data.query.queryString.getQuery().dataset?.title!,
      language: queryLanguage,
      dataSourceId,
    };

    const { query } = await http.post<QueryAssistResponse>('/api/enhancements/assist/generate', {
      body: JSON.stringify(params),
    });

    handleInputChange({ query });

    const timeFilterQuery = calculateTimeFilterQuery(query, timeRange!, selectedIndex);
    submitFn(`%ppl\n${query}${timeFilterQuery}`, 'CODE');
  };

  const handleSubmit = (payload?: any) => {
    if (!payload && !inputValue) {
      return;
    }

    switch (currInputType) {
      case AI_RESPONSE_TYPE:
        onAskAISubmit(inputValue as string, () => setInputValue(''));
        break;
      case 'DEEP_RESEARCH_AGENT':
        submitFn(inputValue as string, DEEP_RESEARCH_PARAGRAPH_TYPE);
        break;
      case 'MARKDOWN':
        submitFn(`%md ${inputValue}`, currInputType);
        setInputValue('');
        break;
      case 'PPL':
      case 'SQL':
        const { timeRange, selectedIndex, isPromptEditorMode } = inputValue as QueryState;
        if (isPromptEditorMode) {
          // TODO: run generated query if the query is not dirty
          handleCallAgent();
        } else {
          const inputQuery = editorTextRef.current;
          const timeFilterQuery = calculateTimeFilterQuery(inputQuery, timeRange!, selectedIndex);
          submitFn(`%ppl\n${inputQuery}${timeFilterQuery}`, 'CODE');
        }
        break;
      case 'VISUALIZATION':
        break;
      default:
    }
  };

  const handleSetCurrInputType = (type: InputType) => {
    setCurrInputType(type);

    // Reset inputValue when changing types
    if (type === 'PPL' || type === 'SQL') {
      setInputValue({
        value: '',
        query: '',
        queryLanguage: type as QueryLanguage,
        isPromptEditorMode: false,
        timeRange: { start: 'now-15m', end: 'now' },
        selectedIndex: data.query.queryString.getDefaultQuery().dataset,
      });
    } else {
      setInputValue('');
    }
  };

  const value: InputContextValue = {
    currInputType,
    inputValue,
    isParagraphSelectionOpen,
    textareaRef,
    editorRef,
    editorTextRef,
    dataView,
    isLoading,
    isParagraph,
    paragraphOptions,
    setCurrInputType: handleSetCurrInputType,
    setIsPopoverOpen: setIsParagraphSelectionOpen,
    handleInputChange,
    handleCancel,
    handleSubmit,
    handleParagraphSelection,
    setDataView,
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
