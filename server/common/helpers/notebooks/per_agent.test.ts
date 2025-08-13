/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObject } from '../../../../../../src/core/server';
import {
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  EXECUTOR_SYSTEM_PROMPT,
} from '../../../../common/constants/notebooks';
import { NotebookContext, ParagraphBackendType } from '../../../../common/types/notebooks';
import * as utils from '../../../routes/utils';
import * as getSetModule from '../../../services/get_set';
import { executePERAgentInParagraph, generateContextPromptFromParagraphs } from './per_agent';

// Mock the modules
jest.mock('../../../routes/utils');
jest.mock('../../../services/get_set');

describe('per_agent', () => {
  let mockTransport: any;
  let mockParagraph: ParagraphBackendType<unknown>;
  let mockMLService: any;
  let mockParagraphServiceSetup: any;
  let mockParagraphRegistry: any;
  let mockRouteContext: any;
  let mockNotebookInfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>;
  let realDate: DateConstructor;
  const mockDate = new Date('2023-01-01T12:00:00.000Z');

  // Mock Date to return a fixed date
  beforeAll(() => {
    realDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }

      static now() {
        return mockDate.getTime();
      }
    } as DateConstructor;
  });

  afterAll(() => {
    global.Date = realDate;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transport
    mockTransport = {
      request: jest.fn(),
    };

    // Mock paragraph
    mockParagraph = {
      id: 'test-paragraph-id',
      input: {
        inputText: 'Test input text',
        inputType: 'TEST_TYPE',
      },
      dateCreated: '2023-01-01T00:00:00.000Z',
      dateModified: '2023-01-01T00:00:00.000Z',
    };

    // Mock ML service
    mockMLService = {
      getMLConfig: jest.fn(),
      executeAgent: jest.fn(),
    };

    // Mock paragraph registry
    mockParagraphRegistry = {
      getContext: jest.fn(),
    };

    // Mock paragraph service setup
    mockParagraphServiceSetup = {
      getParagraphRegistry: jest.fn().mockReturnValue(mockParagraphRegistry),
    };

    // Mock route context
    mockRouteContext = {
      core: {
        opensearch: {
          client: {
            asCurrentUser: {
              transport: mockTransport,
            },
          },
        },
      },
    };

    // Mock notebook info
    mockNotebookInfo = {
      id: 'test-notebook-id',
      type: 'notebook',
      references: [],
      attributes: {
        savedNotebook: {
          context: {
            summary: 'Test summary',
            index: 'test-index',
            timeField: '@timestamp',
          },
        },
      },
    };

    // Setup mocks for imported functions
    (getSetModule.getMLService as jest.Mock).mockReturnValue(mockMLService);
    (getSetModule.getParagraphServiceSetup as jest.Mock).mockReturnValue(mockParagraphServiceSetup);
    (utils.getOpenSearchClientTransport as jest.Mock).mockResolvedValue(mockTransport);
    (utils.getNotebookTopLevelContextPrompt as jest.Mock).mockReturnValue('Top level context');
  });

  describe('getAgentIdFromParagraph', () => {
    it('should extract agent_id from paragraph output if available', async () => {
      // Setup
      const paragraphWithOutput = {
        ...mockParagraph,
        output: [
          {
            result: { agent_id: 'output-agent-id' },
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            execution_time: '100 ms',
          },
        ] as [{ execution_time: string; outputType: string; result: unknown }],
      };

      // Mock executeAgent to return a valid response
      mockMLService.executeAgent.mockResolvedValue({
        body: {
          task_id: 'test-task-id',
          response: {
            memory_id: 'test-memory-id',
          },
        },
      });

      // Execute
      const result = await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: paragraphWithOutput,
      });

      // Verify
      expect(mockMLService.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'output-agent-id',
        })
      );
      expect(result.output?.[0].result).toEqual(
        expect.objectContaining({
          agent_id: 'output-agent-id',
        })
      );
    });

    it('should extract agent_id from ML config if not available in output', async () => {
      // Setup
      // Create a paragraph with output but no agent_id
      const paragraphWithoutAgentId = {
        ...mockParagraph,
        output: [
          {
            result: { some_other_field: 'value' },
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            execution_time: '100 ms',
          },
        ] as [{ execution_time: string; outputType: string; result: unknown }],
      };

      mockMLService.getMLConfig.mockResolvedValue({
        configuration: {
          agent_id: 'config-agent-id',
        },
      });

      mockMLService.executeAgent.mockResolvedValue({
        body: {
          task_id: 'test-task-id',
          response: {
            memory_id: 'test-memory-id',
          },
        },
      });

      // Execute
      const result = await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: paragraphWithoutAgentId,
      });

      // Verify
      expect(mockMLService.getMLConfig).toHaveBeenCalledWith({
        transport: mockTransport,
        configName: 'os_deep_research',
      });
      expect(mockMLService.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'config-agent-id',
        })
      );
      expect(result.output?.[0].result).toEqual(
        expect.objectContaining({
          agent_id: 'config-agent-id',
        })
      );
    });

    it('should throw an error if no agent_id is found', async () => {
      // Setup
      // Create a paragraph with output but no agent_id
      const paragraphWithoutAgentId = {
        ...mockParagraph,
        output: [
          {
            result: { some_other_field: 'value' },
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            execution_time: '100 ms',
          },
        ] as [{ execution_time: string; outputType: string; result: unknown }],
      };

      // Mock ML config to return empty configuration
      mockMLService.getMLConfig.mockResolvedValue({
        configuration: {},
      });

      // Execute & Verify
      await expect(
        executePERAgentInParagraph({
          transport: mockTransport,
          paragraph: paragraphWithoutAgentId,
        })
      ).rejects.toThrow('No PER agent id configured.');
    });
  });

  describe('executePERAgentInParagraph', () => {
    beforeEach(() => {
      // Setup for successful execution
      // Create a paragraph with output containing agent_id
      mockParagraph = {
        ...mockParagraph,
        output: [
          {
            result: { agent_id: 'test-agent-id' },
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            execution_time: '100 ms',
          },
        ] as [{ execution_time: string; outputType: string; result: unknown }],
      };

      mockMLService.executeAgent.mockResolvedValue({
        body: {
          task_id: 'test-task-id',
          response: {
            memory_id: 'test-memory-id',
          },
        },
      });
    });

    it('should execute PER agent with correct parameters', async () => {
      // Setup
      const context = 'Test context';
      const baseMemoryId = 'test-base-memory-id';

      // Execute
      const result = await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: mockParagraph,
        context,
        baseMemoryId,
      });

      // Verify
      expect(mockMLService.executeAgent).toHaveBeenCalledWith({
        transport: mockTransport,
        agentId: 'test-agent-id',
        async: true,
        parameters: expect.objectContaining({
          question: mockParagraph.input.inputText,
          context,
          memory_id: baseMemoryId,
          executor_system_prompt: expect.stringContaining(EXECUTOR_SYSTEM_PROMPT),
        }),
      });

      // Verify result structure
      expect(result).toMatchObject({
        ...mockParagraph,
        dateModified: mockDate.toISOString(),
        input: {
          ...mockParagraph.input,
          parameters: {
            PERAgentContext: context,
          },
        },
        output: [
          {
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            result: {
              taskId: 'test-task-id',
              memoryId: 'test-memory-id',
              agent_id: 'test-agent-id',
            },
          },
        ],
      });

      // Verify PERAgentInput exists
      expect(result.input.parameters.PERAgentInput).toBeDefined();

      // Verify execution_time format
      expect(result.output?.[0].execution_time).toMatch(/\d+\.\d+ ms/);
    });

    it('should include default parameters when context and baseMemoryId are not provided', async () => {
      // Execute
      await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: mockParagraph,
      });

      // Verify
      expect(mockMLService.executeAgent).toHaveBeenCalledWith({
        transport: mockTransport,
        agentId: 'test-agent-id',
        async: true,
        parameters: expect.objectContaining({
          question: mockParagraph.input.inputText,
          context: undefined,
          memory_id: undefined,
        }),
      });
    });

    it('should update paragraph with execution results', async () => {
      // Execute
      const result = await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: mockParagraph,
      });

      // Verify
      expect(result).toMatchObject({
        ...mockParagraph,
        dateModified: mockDate.toISOString(),
        output: [
          {
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            result: {
              taskId: 'test-task-id',
              memoryId: 'test-memory-id',
              agent_id: 'test-agent-id',
            },
          },
        ],
      });

      // Verify PERAgentInput exists
      expect(result.input.parameters.PERAgentInput).toBeDefined();

      // Verify execution_time format
      expect(result.output?.[0].execution_time).toMatch(/\d+\.\d+ ms/);

      // Verify date is the mocked date
      expect(result.dateModified).toBe(mockDate.toISOString());
    });
  });

  describe('generateContextPromptFromParagraphs', () => {
    beforeEach(() => {
      // Setup for paragraph registry
      mockParagraphRegistry.getContext.mockImplementation(
        async ({ paragraph }: { paragraph: ParagraphBackendType<unknown> }) => {
          return `Context for paragraph ${paragraph.id}`;
        }
      );
    });

    it('should generate context prompt from paragraphs', async () => {
      // Setup
      const paragraphs = [
        {
          ...mockParagraph,
          id: 'paragraph-1',
        },
        {
          ...mockParagraph,
          id: 'paragraph-2',
        },
      ];

      // Execute
      const result = await generateContextPromptFromParagraphs({
        paragraphs,
        routeContext: mockRouteContext,
        notebookInfo: mockNotebookInfo,
      });

      // Verify
      expect(utils.getNotebookTopLevelContextPrompt).toHaveBeenCalledWith(mockNotebookInfo);
      expect(utils.getOpenSearchClientTransport).toHaveBeenCalledTimes(2);
      expect(mockParagraphServiceSetup.getParagraphRegistry).toHaveBeenCalledTimes(2);
      expect(mockParagraphRegistry.getContext).toHaveBeenCalledTimes(2);

      // Verify result
      expect(result).toBe(
        'Top level context\nContext for paragraph paragraph-1\nContext for paragraph paragraph-2'
      );
    });

    it('should filter out paragraphs with ignored input types', async () => {
      // Setup
      const paragraphs = [
        {
          ...mockParagraph,
          id: 'paragraph-1',
          input: {
            inputText: 'Test input 1',
            inputType: 'TYPE_1',
          },
        },
        {
          ...mockParagraph,
          id: 'paragraph-2',
          input: {
            inputText: 'Test input 2',
            inputType: 'TYPE_2',
          },
        },
        {
          ...mockParagraph,
          id: 'paragraph-3',
          input: {
            inputText: 'Test input 3',
            inputType: 'TYPE_3',
          },
        },
      ];

      // Execute
      const result = await generateContextPromptFromParagraphs({
        paragraphs,
        routeContext: mockRouteContext,
        notebookInfo: mockNotebookInfo,
        ignoreInputTypes: ['TYPE_2'],
      });

      // Verify
      expect(utils.getOpenSearchClientTransport).toHaveBeenCalledTimes(2);
      expect(mockParagraphServiceSetup.getParagraphRegistry).toHaveBeenCalledTimes(2);
      expect(mockParagraphRegistry.getContext).toHaveBeenCalledTimes(2);

      // Verify result
      expect(result).toBe(
        'Top level context\nContext for paragraph paragraph-1\nContext for paragraph paragraph-3'
      );
    });

    it('should handle paragraphs with missing registry', async () => {
      // Setup
      const paragraphs = [
        {
          ...mockParagraph,
          id: 'paragraph-1',
        },
        {
          ...mockParagraph,
          id: 'paragraph-2',
          input: {
            inputText: 'Test input 2',
            inputType: 'UNKNOWN_TYPE',
          },
        },
      ];

      // Mock registry to return undefined for UNKNOWN_TYPE
      mockParagraphServiceSetup.getParagraphRegistry.mockImplementation((type: string) => {
        if (type === 'UNKNOWN_TYPE') {
          return undefined;
        }
        return mockParagraphRegistry;
      });

      // Execute
      const result = await generateContextPromptFromParagraphs({
        paragraphs,
        routeContext: mockRouteContext,
        notebookInfo: mockNotebookInfo,
      });

      // Verify
      expect(utils.getOpenSearchClientTransport).toHaveBeenCalledTimes(2);
      expect(mockParagraphServiceSetup.getParagraphRegistry).toHaveBeenCalledTimes(2);
      expect(mockParagraphRegistry.getContext).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result).toBe('Top level context\nContext for paragraph paragraph-1');
    });
  });
});
