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
import { NoteBookServices } from 'public/types';
import { EuiSelectableOption } from '@elastic/eui';
// import { useAgentSelectSubmit } from './use_agent_select_submit';
import {
  InputType,
  QueryLanguage,
  QueryState,
  InputValueType,
  InputTypeOption,
  ParagraphInputType,
} from './types';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { AI_RESPONSE_TYPE } from '../../../../../common/constants/notebooks';
import { NotebookReactContext } from '../../context_provider/context_provider';
import {
  QueryAssistParameters,
  QueryAssistResponse,
} from '../../../../../../../src/plugins/query_enhancements/common/query_assist';
import { formatTimePickerDate, TimeRange } from '../../../../../../../src/plugins/data/common';

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
  isInputMountedInParagraph: boolean;

  // All the availble paragraph options that are used to determine input variant
  paragraphOptions: InputTypeOption[];

  // Data source ID from notebook context
  dataSourceId: string | undefined;

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
  handleSubmit: (payload?: any) => void;

  // Handle open the popover for creating blank
  handleParagraphSelection: (options: EuiSelectableOption[]) => void;

  // For query editor
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  editorTextRef: React.MutableRefObject<string>;
  dataView: any;
  setDataView: (view: any) => void;
}

const InputContext = createContext<InputContextValue | undefined>(undefined);

interface InputProviderProps<TParameters = unknown> {
  children: ReactNode;
  onSubmit: (input: ParagraphInputType<TParameters>) => void;
  input?: ParagraphInputType<TParameters>;
}

export const InputProvider: React.FC<InputProviderProps> = ({ children, onSubmit, input }) => {
  const {
    services: { http, data },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [currInputType, setCurrInputType] = useState<InputType>(
    (input?.inputType as InputType) || AI_RESPONSE_TYPE
  );

  const getInitialInputValue = () => {
    if (!input?.inputText) return undefined;

    if (input.inputType === 'PPL' || input.inputType === 'SQL') {
      // FIXME: remove this when the executing of a query is properly implemented
      const cleanedQuery = input.inputText.replace(TIME_FILTER_QUERY_REGEX, '');

      const { timeRange, question } = (input.parameters as any) || {};

      return {
        // Use natural language question as input text if is t2ppl
        value: question || cleanedQuery || '',
        // Set generated query if is t2ppl
        query: question ? cleanedQuery.replace(TIME_FILTER_QUERY_REGEX, '') : '',
        queryLanguage: input.inputType as QueryLanguage,
        // If question is defined, indicate the user executed t2ppl previously
        isPromptEditorMode: !!question,
        timeRange,
        selectedIndex: data.query.queryString.getDefaultQuery().dataset, // FIXME
        parameters: input.parameters,
      } as InputValueType<typeof currInputType>;
    }

    return input.inputText as InputValueType<typeof currInputType>;
  };

  const [inputValue, setInputValue] = useState<InputValueType<typeof currInputType> | undefined>(
    getInitialInputValue()
  );
  const [isParagraphSelectionOpen, setIsParagraphSelectionOpen] = useState(false);
  const [dataView, setDataView] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(false);

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

  const paragraphOptions = useMemo(
    () =>
      [
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
    [initialGoal]
  );

  const handleCancel = useCallback(() => {
    setInputValue('');
    setCurrInputType(AI_RESPONSE_TYPE);
  }, []);

  // const { handleAgentSelectSubmit } = useAgentSelectSubmit({
  //   http,
  //   dataSourceId,
  //   onSubmit,
  //   setIsLoading,
  // });

  const handleParagraphSelection = (options: EuiSelectableOption[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    if (selectedOption) {
      const paragraphType = selectedOption.key as InputType;

      // Create empty paragraph
      onSubmit({ inputText: '', inputType: paragraphType });

      setIsParagraphSelectionOpen(false);
      handleInputChange('');
      handleCancel();
    }
  };

  const isInputMountedInParagraph = !!input;

  const calculateQueryWithTimeFilter = useCallback(
    (query: string, timeRange: TimeRange, selectedIndex: any) => {
      const queryState = inputValue as QueryState;
      if (TIME_FILTER_QUERY_REGEX.test(query) || queryState?.parameters?.noDatePicker) {
        return query;
      }

      const { fromDate, toDate } = formatTimePickerDate(timeRange, TIME_FILTER_FORMAT);
      const timeFieldName = selectedIndex.timeFieldName;
      const whereCommand = timeFieldName
        ? `WHERE \`${timeFieldName}\` >= '${fromDate}' AND \`${timeFieldName}\` <= '${toDate}'`
        : '';

      // Append time filter where command after the first command
      const commands = query.split('|');
      commands.splice(1, 0, whereCommand);
      return commands.map((cmd) => cmd.trim()).join(' | ');
    },
    [inputValue]
  );

  const handleGenerateQuery = async () => {
    const params: QueryAssistParameters = {
      question: editorTextRef.current,
      index: data.query.queryString.getQuery().dataset?.title!,
      language: (inputValue as QueryState).queryLanguage,
      dataSourceId,
    };

    const { query } = await http.post<QueryAssistResponse>('/api/enhancements/assist/generate', {
      body: JSON.stringify(params),
    });

    handleInputChange({ query });

    return query;
  };

  const handleSubmit = async (payload?: unknown) => {
    if (!payload && !inputValue) {
      return;
    }

    setIsLoading(true);

    try {
      switch (currInputType) {
        case 'SQL':
          onSubmit({ inputText: editorTextRef.current, inputType: 'SQL' });
          break;
        case 'PPL':
          // Specially handle PPL to insert timerange and natural language information
          const { timeRange, selectedIndex, isPromptEditorMode } = inputValue as QueryState;
          const query = isPromptEditorMode ? await handleGenerateQuery() : editorTextRef.current;
          onSubmit({
            inputText: calculateQueryWithTimeFilter(query, timeRange, selectedIndex),
            inputType: 'PPL',
            parameters: {
              timeRange,
              ...(isPromptEditorMode && { question: editorTextRef.current }),
            },
          });
          break;
        default:
          onSubmit({ inputText: inputValue as string, inputType: currInputType });
      }

      if (!isInputMountedInParagraph) handleCancel();
    } catch (err) {
      console.log('error while execute the input', err);
    } finally {
      setIsLoading(false);
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
        timeRange: { from: 'now-15m', to: 'now' },
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
    isInputMountedInParagraph,
    paragraphOptions,
    dataSourceId,
    handleSetCurrInputType,
    setIsParagraphSelectionOpen,
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
