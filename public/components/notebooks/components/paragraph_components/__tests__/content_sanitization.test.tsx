/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable */

import React from 'react';
import { render } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { MarkdownParagraph } from '../markdown';
import { OtherParagraph } from '../other';
import { DeepResearchOutput } from '../deep_research/deep_research_output';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { PERAgentMemoryService } from '../deep_research/services/per_agent_memory_service';
import { PERAgentMessageService } from '../deep_research/services/per_agent_message_service';

// Mock only the problematic dependencies, not the rendering libraries
const mockRunParagraph = jest.fn();

jest.mock('../../../context_provider/context_provider', () => {
  const mockReact = require('react');
  return {
    NotebookReactContext: mockReact.createContext({
      state: {
        value: {
          context: {
            getValue$: () => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) }),
            value: { notebookType: 'CLASSIC' },
          },
        },
      },
      paragraphHooks: { runParagraph: mockRunParagraph },
    }),
  };
});

// Don't mock @nteract/markdown or @nteract/outputs - let them render actual content
const MockContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { NotebookReactContext } = require('../../../context_provider/context_provider');
  return (
    <NotebookReactContext.Provider
      value={{
        state: {
          value: {
            context: {
              getValue$: () => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) }),
              value: { notebookType: 'CLASSIC' },
            },
          },
        },
        paragraphHooks: { runParagraph: mockRunParagraph },
      }}
    >
      {children}
    </NotebookReactContext.Provider>
  );
};

describe('XSS Protection Verification', () => {
  configure({ adapter: new Adapter() });

  let consoleSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  let evalSpy: jest.SpyInstance;
  let originalAlert: typeof window.alert;
  let originalEval: typeof window.eval;
  let xssExecuted = false;

  beforeEach(() => {
    xssExecuted = false;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      if (
        args.some((arg) => typeof arg === 'string' && (arg.includes('xss') || arg.includes('hack')))
      ) {
        xssExecuted = true;
      }
    });
    originalAlert = window.alert;
    originalEval = window.eval;
    alertSpy = jest.fn(() => {
      xssExecuted = true;
    });
    evalSpy = jest.fn(() => {
      xssExecuted = true;
    });
    window.alert = alertSpy;
    window.eval = evalSpy;

    // Also monitor global object pollution
    (window as any).xssExecuted = false;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    window.alert = originalAlert;
    window.eval = originalEval;
    delete (window as any).xssExecuted;
  });

  const xssPayloads = [
    // Basic script injection
    '<script>console.log("xss-executed")</script>',
    '<script>alert("xss")</script>',

    // Event handlers
    '<img src="x" onerror="console.log(\\"img-xss\\")">',
    '<svg onload="alert("svg-xss")">',
    '<body onload="alert(1)">',
    '<div onclick="alert(1)">click</div>',

    // JavaScript URLs
    '<iframe src="javascript:console.log(\\"iframe-xss\\")"></iframe>',
    '<a href="javascript:alert(1)">link</a>',

    // Data URLs with JavaScript
    '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',

    // HTML entities and encoding bypasses
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '<script>alert(String.fromCharCode(88,83,83))</script>',

    // CSS-based XSS
    '<style>@import"javascript:alert(1)"</style>',
    '<div style="background:url(javascript:alert(1))">',

    // Form-based XSS
    '<form><button formaction="javascript:alert(1)">Submit</button></form>',

    // Meta refresh XSS
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',

    // Object/embed XSS
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',

    // Template injection attempts
    '{{constructor.constructor("alert(1)")()}}',
    '${alert(1)}',

    // Markdown-specific XSS
    '[XSS](javascript:alert(1))',
    '![XSS](javascript:alert(1))',

    // Mixed content attacks
    '<p>Normal text <script>alert(1)</script> more text</p>',
    'Normal text\n<script>alert(1)</script>\nMore text',
  ];

  describe('MarkdownParagraph XSS protection', () => {
    xssPayloads.forEach((payload) => {
      it(`should prevent XSS from payload: ${payload.substring(0, 30)}...`, () => {
        const mockParagraphState = ({
          getValue$: jest.fn(() => ({
            subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
          })),
          value: {
            id: 'test-id',
            input: { inputText: '' },
            output: { result: payload },
            uiState: { viewMode: 'output_only' },
          },
          updateUIState: jest.fn(),
        } as unknown) as ParagraphState;

        const { container } = render(
          <MockContextProvider>
            <MarkdownParagraph paragraphState={mockParagraphState} actionDisabled={false} />
          </MockContextProvider>
        );

        // Verify XSS code is not executed
        expect(xssExecuted).toBe(false);
        expect(alertSpy).not.toHaveBeenCalled();
        expect(evalSpy).not.toHaveBeenCalled();
        expect((window as any).xssExecuted).toBe(false);

        // Verify dangerous content is properly escaped in DOM
        expect(container.innerHTML).not.toContain('<script>');
        expect(container.innerHTML).not.toContain('javascript:');
        expect(container.innerHTML).not.toContain('onerror=');
      });
    });
  });

  describe('OtherParagraph XSS protection', () => {
    it('should prevent XSS in HTML output type', () => {
      const maliciousHtml = '<script>alert("hack")</script><p>Content</p>';
      const mockParagraphState = ({
        getValue$: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
        value: {
          output: {
            result: maliciousHtml,
            outputType: 'HTML',
          },
        },
      } as unknown) as ParagraphState<string>;

      const { container } = render(<OtherParagraph paragraphState={mockParagraphState} />);

      // Verify XSS code is not executed
      expect(xssExecuted).toBe(false);
      expect(alertSpy).not.toHaveBeenCalled();
      expect(evalSpy).not.toHaveBeenCalled();
    });

    it('should prevent javascript URLs in IMG output', () => {
      const suspiciousImageData = 'javascript:alert(1)';
      const mockParagraphState = ({
        getValue$: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
        value: {
          output: {
            result: suspiciousImageData,
            outputType: 'IMG',
          },
        },
      } as unknown) as ParagraphState<string>;

      const { container } = render(<OtherParagraph paragraphState={mockParagraphState} />);
      const img = container.querySelector('img');

      // Verify javascript: URLs are handled safely
      if (img?.src) {
        expect(img.src).not.toMatch(/^javascript:/);
      } else {
        // If no img src, verify no XSS execution occurred
        expect(alertSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('DeepResearchOutput XSS protection', () => {
    xssPayloads.forEach((payload) => {
      it(`should prevent XSS in agent responses: ${payload.substring(0, 30)}...`, () => {
        const mockMessageService = ({
          getMessage$: jest.fn(() => ({
            subscribe: jest.fn(),
          })),
        } as unknown) as PERAgentMessageService;

        const mockMemoryService = ({
          getMessages$: jest.fn(() => ({
            subscribe: jest.fn(),
          })),
          getPollingState$: jest.fn(() => ({
            subscribe: jest.fn(),
          })),
          startPolling: jest.fn(),
        } as unknown) as PERAgentMemoryService;

        jest.spyOn(mockMessageService, 'getMessage$').mockReturnValue({
          subscribe: jest.fn((callback) => {
            callback({ response: payload });
            return { unsubscribe: jest.fn() };
          }),
        } as any);

        jest.spyOn(mockMemoryService, 'getMessages$').mockReturnValue({
          subscribe: jest.fn((callback) => {
            callback([]);
            return { unsubscribe: jest.fn() };
          }),
        } as any);

        jest.spyOn(mockMemoryService, 'getPollingState$').mockReturnValue({
          subscribe: jest.fn((callback) => {
            callback(false);
            return { unsubscribe: jest.fn() };
          }),
        } as any);

        const { container } = render(
          <DeepResearchOutput
            messageService={mockMessageService}
            executorMemoryService={mockMemoryService}
            onExplainThisStep={jest.fn()}
          />
        );

        // Verify XSS code is not executed
        expect(xssExecuted).toBe(false);
        expect(alertSpy).not.toHaveBeenCalled();
        expect(evalSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Overall XSS protection verification', () => {
    it('should not contain executable script elements in any component', () => {
      // Test all components with the most dangerous payload
      const scriptPayload = '<script>alert("xss")</script>';

      const containers = [];

      // Test MarkdownParagraph
      const markdownState = ({
        getValue$: jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) })),
        value: {
          id: 'test',
          input: { inputText: '' },
          output: { result: scriptPayload },
          uiState: { viewMode: 'output_only' },
        },
        updateUIState: jest.fn(),
      } as unknown) as ParagraphState;

      const { container: mdContainer } = render(
        <MockContextProvider>
          <MarkdownParagraph paragraphState={markdownState} actionDisabled={false} />
        </MockContextProvider>
      );
      containers.push(mdContainer);

      // Test OtherParagraph
      const otherState = ({
        getValue$: jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) })),
        value: {
          output: { result: scriptPayload, outputType: 'HTML' },
        },
      } as unknown) as ParagraphState<string>;

      const { container: otherContainer } = render(<OtherParagraph paragraphState={otherState} />);
      containers.push(otherContainer);

      // Verify no XSS code was executed across all components
      expect(xssExecuted).toBe(false);
      expect(alertSpy).not.toHaveBeenCalled();
      expect(evalSpy).not.toHaveBeenCalled();

      // Verify dangerous content is properly handled in DOM
      containers.forEach((container) => {
        // Check that script tags either don't exist or are inert
        const scripts = container.querySelectorAll('script');
        scripts.forEach((script) => {
          // If scripts exist, they should be inert (no dangerous content)
          expect(script.innerHTML).not.toContain('alert');
          expect(script.innerHTML).not.toContain('console.log');
        });

        // Verify no dangerous attributes exist
        const allElements = container.querySelectorAll('*');
        allElements.forEach((element) => {
          expect(element.getAttribute('onerror')).toBeNull();
          expect(element.getAttribute('onload')).toBeNull();
          expect(element.getAttribute('onclick')).toBeNull();
        });
      });
    });
  });
});
