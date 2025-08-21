/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { monaco } from '@osd/monaco';
import { i18n } from '@osd/i18n';
import { NoteBookServices } from 'public/types';
import { promptEditorOptions, queryEditorOptions } from './editor_options';
import { getCommandEnterAction } from './command_enter_action';
import { getShiftEnterAction } from './shift_enter_action';
import { getTabAction } from './tab_action';
import { getEnterAction } from './enter_action';
import { getSpacebarAction } from './spacebar_action';
import { getEscapeAction } from './escape_action';
import { usePromptIsTyping } from './use_prompt_is_typing';
import {
  DATA_STRUCTURE_META_TYPES,
  DataStructure,
} from '../../../../../../../../../src/plugins/data/common';

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
type LanguageConfiguration = monaco.languages.LanguageConfiguration;
type IEditorConstructionOptions = monaco.editor.IEditorConstructionOptions;

export const DEFAULT_DATA = {
  STRUCTURES: {
    ROOT: {
      id: 'ROOT',
      title: 'Data',
      type: 'ROOT',
      meta: {
        type: DATA_STRUCTURE_META_TYPES.FEATURE,
        icon: { type: 'folderOpen' },
        tooltip: 'Root Data Structure',
      },
    } as DataStructure,
    LOCAL_DATASOURCE: {
      id: '',
      title: 'Default Cluster',
      type: 'DATA_SOURCE',
    },
  },

  SET_TYPES: {
    INDEX_PATTERN: 'INDEX_PATTERN',
    INDEX: 'INDEXES',
  },

  SOURCE_TYPES: {
    OPENSEARCH: 'OpenSearch',
    LEGACY: 'LEGACY',
  },
};

const sqlModePlaceholder = i18n.translate(
  'notebook.queryPanel.queryPanelEditor.sqlModePlaceholder',
  {
    defaultMessage: 'Search using {symbol} SQL',
    values: {
      symbol: '</>',
    },
  }
);

const enabledPromptPlaceholder = i18n.translate(
  'notebook.queryPanel.queryPanelEditor.enabledPromptPlaceholder',
  {
    defaultMessage: 'Press `space` to Ask AI with natural language, or search with PPL',
  }
);

const disabledPromptPlaceholder = i18n.translate(
  'notebook.queryPanel.queryPanelEditor.disabledPromptPlaceholder',
  {
    defaultMessage: 'Search using {symbol} PPL',
    values: {
      symbol: '</>',
    },
  }
);

const promptModePlaceholder = i18n.translate(
  'notebook.queryPanel.queryPanelEditor.promptPlaceholder',
  {
    defaultMessage: 'Ask AI with natural language. `Esc` to clear and search with PPL',
  }
);

const TRIGGER_CHARACTERS = [' '];

const languageConfiguration: LanguageConfiguration = {
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  wordPattern: /@?\w[\w@'.-]*[?!,;:"]*/, // Consider tokens containing . @ as words while applying suggestions. Refer https://github.com/opensearch-project/OpenSearch-Dashboards/pull/10118#discussion_r2201428532 for details.
};

interface UseQueryPanelEditorProps {
  services: NoteBookServices;
  promptModeIsAvailable: boolean;
  isPromptEditorMode: boolean;
  queryLanguage: string;
  userQueryString: string;
  handleRun: () => void;
  handleEscape: () => void;
  handleSpaceBar: () => void;
  handleChange: () => void;
  editorTextRef: React.MutableRefObject<string>;
  editorRef: React.MutableRefObject<IStandaloneCodeEditor | null>;
  isQueryEditorDirty: boolean;
  datasetId?: any;
}

export interface UseQueryPanelEditorReturnType {
  editorDidMount: (editor: IStandaloneCodeEditor) => () => IStandaloneCodeEditor;
  isFocused: boolean;
  isPromptMode: boolean;
  languageConfiguration: LanguageConfiguration;
  languageId: string;
  onChange: (text: string) => void;
  onEditorClick: () => void;
  options: IEditorConstructionOptions;
  placeholder: string;
  promptIsTyping: boolean;
  suggestionProvider: monaco.languages.CompletionItemProvider;
  showPlaceholder: boolean;
  useLatestTheme: true;
  value: string;
}

export const useQueryPanelEditor = ({
  services,
  promptModeIsAvailable,
  isPromptEditorMode: isPromptMode,
  queryLanguage,
  userQueryString,
  handleRun,
  handleEscape,
  handleSpaceBar,
  handleChange,
  editorTextRef,
  editorRef,
  isQueryEditorDirty,
  datasetId,
}: UseQueryPanelEditorProps): UseQueryPanelEditorReturnType => {
  const { promptIsTyping, handleChangeForPromptIsTyping } = usePromptIsTyping();
  const [editorText, setEditorText] = useState<string>(userQueryString);
  const [editorIsFocused, setEditorIsFocused] = useState(false);
  const {
    data: {
      dataViews,
      query: { queryString },
    },
  } = services;
  const isQueryMode = !isPromptMode;
  const isPromptModeRef = useRef(isPromptMode);
  const promptModeIsAvailableRef = useRef(promptModeIsAvailable);
  const handleRunRef = useRef(handleRun);

  // Keep the refs updated with latest context
  useEffect(() => {
    editorTextRef.current = editorText;
  }, [editorText, editorTextRef]);
  useEffect(() => {
    isPromptModeRef.current = isPromptMode;
  }, [isPromptMode]);
  useEffect(() => {
    promptModeIsAvailableRef.current = promptModeIsAvailable;
  }, [promptModeIsAvailable]);
  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  // The 'triggerSuggestOnFocus' prop of CodeEditor only happens on mount, so I am intentionally not passing it
  // and programmatically doing it here. We should only trigger autosuggestion on focus while on isQueryMode and there is text
  useEffect(() => {
    if (isQueryMode && !!editorText.length) {
      const onDidFocusDisposable = editorRef.current?.onDidFocusEditorWidget(() => {
        editorRef.current?.trigger('keyboard', 'editor.action.triggerSuggest', {});
      });

      return () => {
        onDidFocusDisposable?.dispose();
      };
    }
  }, [isQueryMode, editorRef, editorText]);

  const setEditorRef = useCallback(
    (editor: IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    [editorRef]
  );

  // Real autocomplete implementation using the data plugin's autocomplete service
  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _: monaco.languages.CompletionContext,
      token: monaco.CancellationToken
    ): Promise<monaco.languages.CompletionList> => {
      if (token.isCancellationRequested) {
        return { suggestions: [], incomplete: false };
      }
      try {
        const effectiveLanguage = isPromptModeRef.current ? 'AI' : queryLanguage;

        // Get the current dataset from Query Service to avoid stale closure values
        const currentDataset = queryString.getQuery().dataset;
        const currentDataView = await dataViews.get(
          currentDataset?.id! || datasetId,
          currentDataset?.type !== DEFAULT_DATA.SET_TYPES.INDEX_PATTERN
        );

        // Use the current Dataset to avoid stale data
        const suggestions = await services?.data?.autocomplete?.getQuerySuggestions({
          query: model.getValue(), // Use the current editor content, using the local query results in a race condition where we can get stale query data
          selectionStart: model.getOffsetAt(position),
          selectionEnd: model.getOffsetAt(position),
          language: effectiveLanguage,
          baseLanguage: queryLanguage, // Pass the original language before transformation
          indexPattern: currentDataView,
          datasetType: currentDataset?.type,
          position,
          services: services as any, // NotebookServices storage type incompatible with IDataPluginServices.DataStorage
        });

        // current completion item range being given as last 'word' at pos
        const wordUntil = model.getWordUntilPosition(position);

        const defaultRange = new monaco.Range(
          position.lineNumber,
          wordUntil.startColumn,
          position.lineNumber,
          wordUntil.endColumn
        );

        const filteredSuggestions = suggestions?.filter((s: any) => 'detail' in s) || [];

        const monacoSuggestions = filteredSuggestions.map((s: any) => ({
          label: s.text,
          kind: s.type as monaco.languages.CompletionItemKind,
          insertText: s.insertText ?? s.text,
          insertTextRules: s.insertTextRules ?? undefined,
          range: defaultRange,
          detail: s.detail,
          sortText: s.sortText,
          documentation: s.documentation
            ? {
                value: s.documentation,
                isTrusted: true,
              }
            : '',
          command: {
            id: 'editor.action.triggerSuggest',
            title: 'Trigger Next Suggestion',
          },
        }));

        return {
          suggestions: monacoSuggestions,
          incomplete: false,
        };
      } catch (autocompleteError) {
        return { suggestions: [], incomplete: false };
      }
    },
    [isPromptModeRef, queryLanguage, queryString, dataViews, services, datasetId]
  );

  const suggestionProvider = useMemo(() => {
    return {
      triggerCharacters: isPromptMode ? ['='] : TRIGGER_CHARACTERS,
      provideCompletionItems,
    };
  }, [isPromptMode, provideCompletionItems]);

  const editorDidMount = useCallback(
    (editor: IStandaloneCodeEditor) => {
      setEditorRef(editor);

      const focusDisposable = editor.onDidFocusEditorText(() => {
        setEditorIsFocused(true);
      });
      const blurDisposable = editor.onDidBlurEditorText(() => {
        setEditorIsFocused(false);
      });

      editor.addAction(getCommandEnterAction(() => handleRunRef.current()));
      editor.addAction(getShiftEnterAction());

      // Add Tab key handling to trigger next autosuggestions after selection
      editor.addAction(getTabAction());

      // Add Enter key handling for suggestions
      editor.addAction(getEnterAction(() => handleRunRef.current()));

      // Add Space bar key handling to switch to prompt mode
      editor.addAction(
        getSpacebarAction(promptModeIsAvailableRef, isPromptModeRef, editorTextRef, handleSpaceBar)
      );

      // Add Escape key handling to switch to query mode
      editor.addAction(getEscapeAction(isPromptModeRef, handleEscape));

      editor.onDidContentSizeChange(() => {
        const contentHeight = editor.getContentHeight();
        const maxHeight = 100;
        const finalHeight = Math.min(contentHeight, maxHeight);

        editor.layout({
          width: editor.getLayoutInfo().width,
          height: finalHeight,
        });

        editor.updateOptions({
          scrollBeyondLastLine: false,
          scrollbar: {
            vertical: contentHeight > maxHeight ? 'visible' : 'hidden',
          },
        });
      });

      return () => {
        focusDisposable.dispose();
        blurDisposable.dispose();
        return editor;
      };
    },
    [setEditorRef, handleEscape, setEditorIsFocused, editorTextRef, handleSpaceBar]
  );

  const options = useMemo(() => {
    if (isQueryMode) {
      return queryEditorOptions;
    } else {
      return promptEditorOptions;
    }
  }, [isQueryMode]);

  const placeholder = useMemo(() => {
    if (queryLanguage === 'SQL') {
      return sqlModePlaceholder;
    }

    if (!promptModeIsAvailable) {
      return disabledPromptPlaceholder;
    }

    return isPromptMode ? promptModePlaceholder : enabledPromptPlaceholder;
  }, [isPromptMode, promptModeIsAvailable, queryLanguage]);

  const onEditorClick = useCallback(() => {
    editorRef.current?.focus();
  }, [editorRef]);

  const onChange = useCallback(
    (newText: string) => {
      setEditorText(newText);

      if (!isQueryEditorDirty) {
        handleChange();
      }

      if (isPromptMode) {
        handleChangeForPromptIsTyping();
      }
    },
    [setEditorText, isPromptMode, handleChangeForPromptIsTyping, isQueryEditorDirty, handleChange]
  );

  return {
    editorDidMount,
    isFocused: editorIsFocused,
    isPromptMode,
    languageConfiguration,
    languageId: isPromptMode ? 'AI' : queryLanguage,
    onChange,
    onEditorClick,
    options,
    placeholder,
    promptIsTyping,
    suggestionProvider,
    showPlaceholder: !editorText.length,
    useLatestTheme: true,
    value: editorText,
  };
};
