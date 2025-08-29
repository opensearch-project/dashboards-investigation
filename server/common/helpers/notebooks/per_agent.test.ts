/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  EXECUTOR_SYSTEM_PROMPT,
} from '../../../../common/constants/notebooks';
import {
  DeepResearchInputParameters,
  ParagraphBackendType,
} from '../../../../common/types/notebooks';
import * as utils from '../../../routes/utils';
import * as getSetModule from '../../../services/get_set';
import { executePERAgentInParagraph } from './per_agent';

// Mock the modules
jest.mock('../../../routes/utils');
jest.mock('../../../services/get_set');

describe('per_agent', () => {
  let mockTransport: any;
  let mockParagraph: ParagraphBackendType<unknown, DeepResearchInputParameters>;
  let mockMLService: any;
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

    // Setup mocks for imported functions
    (getSetModule.getMLService as jest.Mock).mockReturnValue(mockMLService);
    (utils.getOpenSearchClientTransport as jest.Mock).mockResolvedValue(mockTransport);
  });

  describe('getAgentIdFromParagraph', () => {
    it('should extract agent_id from paragraph input if available', async () => {
      // Setup
      const paragraphWithOutput = {
        ...mockParagraph,
        input: {
          ...mockParagraph.input,
          parameters: {
            ...mockParagraph.input.parameters,
            agentId: 'input-agent-id',
          },
        },
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
          agentId: 'input-agent-id',
        })
      );
      expect(result.input.parameters?.agentId).toEqual('input-agent-id');
    });

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
      expect(result.input.parameters?.agentId).toEqual('output-agent-id');
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
      expect(result.input.parameters?.agentId).toEqual('config-agent-id');
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
    const context = 'Test context';
    beforeEach(() => {
      // Setup for successful execution
      // Create a paragraph with output containing agent_id
      mockParagraph = {
        ...mockParagraph,
        input: {
          ...mockParagraph.input,
          parameters: { agentId: 'test-agent-id', PERAgentContext: context },
        },
        output: [
          {
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
      const baseMemoryId = 'test-base-memory-id';

      // Execute
      const result = await executePERAgentInParagraph({
        transport: mockTransport,
        paragraph: mockParagraph,
        baseMemoryId,
      });

      // Verify
      expect(mockMLService.executeAgent).toHaveBeenCalledWith({
        transport: mockTransport,
        agentId: 'test-agent-id',
        async: true,
        parameters: expect.objectContaining({
          question: mockParagraph.input.inputText,
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
            agentId: 'test-agent-id',
            PERAgentContext: context,
          },
        },
        output: [
          {
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            result: {
              taskId: 'test-task-id',
              memoryId: 'test-memory-id',
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
        input: {
          parameters: {
            agentId: 'test-agent-id',
          },
        },
        dateModified: mockDate.toISOString(),
        output: [
          {
            outputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
            result: {
              taskId: 'test-task-id',
              memoryId: 'test-memory-id',
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
});
