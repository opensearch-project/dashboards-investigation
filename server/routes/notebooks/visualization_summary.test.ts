/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { registerVisualizationSummaryRoute, isValidImageFormat } from './visualization_summary';
import { setLogger } from '../../services/get_set';

describe('registerVisualizationSummaryRoute', () => {
  let mockRouter: any;
  let mockContext: any;
  let mockRequest: any;
  let mockResponse: any;
  let routeHandler: any;

  beforeEach(() => {
    // Set up mock logger for handleError
    setLogger({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      get: jest.fn(),
    } as any);

    // Mock router
    mockRouter = {
      post: jest.fn(),
    };

    // Mock context
    mockContext = {
      core: {
        opensearch: {
          client: {
            asCurrentUser: {
              transport: {
                request: jest.fn(),
              },
            },
          },
        },
      },
    };

    // Mock request
    mockRequest = {
      body: {
        visualization: '/9j/4AAQSkZJRgABAQ==',
        localTimeZoneOffset: 480,
      },
      query: {},
    };

    // Mock response
    mockResponse = {
      ok: jest.fn((params) => params),
      badRequest: jest.fn((params) => params),
      notFound: jest.fn((params) => params),
      customError: jest.fn((params) => params),
    };

    // Register the route and capture the handler
    registerVisualizationSummaryRoute(mockRouter);
    routeHandler = mockRouter.post.mock.calls[0][1];
  });

  it('should register POST route at /api/investigation/visualization/summary', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/investigation/visualization/summary',
      }),
      expect.any(Function)
    );
  });

  it('should retrieve agent ID from ML config API', async () => {
    const mockConfigResponse = {
      body: {
        configuration: {
          agent_id: 'agent-123',
        },
      },
    };

    mockContext.core.opensearch.client.asCurrentUser.transport.request
      .mockResolvedValueOnce(mockConfigResponse)
      .mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    output: {
                      message: {
                        content: [{ text: 'Test summary' }],
                      },
                    },
                  }),
                },
              ],
            },
          ],
        },
      });

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.core.opensearch.client.asCurrentUser.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/_plugins/_ml/config/os_visualization_summary',
      })
    );
  });

  it('should return 404 if agent ID is not found in config', async () => {
    mockContext.core.opensearch.client.asCurrentUser.transport.request.mockResolvedValueOnce({
      body: {
        configuration: {},
      },
    });

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: {
        message: 'Agent not found.',
      },
    });
  });

  it('should call ML agent execute API with visualization', async () => {
    const mockConfigResponse = {
      body: {
        configuration: {
          agent_id: 'agent-123',
        },
      },
    };

    const mockPredictResponse = {
      body: {
        inference_results: [
          {
            output: [
              {
                result: JSON.stringify({
                  output: {
                    message: {
                      content: [{ text: 'Test summary' }],
                    },
                  },
                }),
              },
            ],
          },
        ],
      },
    };

    mockContext.core.opensearch.client.asCurrentUser.transport.request
      .mockResolvedValueOnce(mockConfigResponse)
      .mockResolvedValueOnce(mockPredictResponse);

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockContext.core.opensearch.client.asCurrentUser.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/_plugins/_ml/agents/agent-123/_execute',
        body: {
          parameters: {
            image_base64: '/9j/4AAQSkZJRgABAQ==',
            local_time_offset: 480,
          },
        },
      }),
      expect.objectContaining({
        requestTimeout: 60000,
        maxRetries: 0,
      })
    );
  });

  it('should call ML agent execute API with timeout options', async () => {
    const mockConfigResponse = {
      body: {
        configuration: {
          agent_id: 'agent-123',
        },
      },
    };

    const mockPredictResponse = {
      body: {
        inference_results: [
          {
            output: [
              {
                result: JSON.stringify({
                  output: {
                    message: {
                      content: [{ text: 'Test summary' }],
                    },
                  },
                }),
              },
            ],
          },
        ],
      },
    };

    mockContext.core.opensearch.client.asCurrentUser.transport.request
      .mockResolvedValueOnce(mockConfigResponse)
      .mockResolvedValueOnce(mockPredictResponse);

    await routeHandler(mockContext, mockRequest, mockResponse);

    // Verify that the second call (ML agent execute) includes timeout options
    const secondCall =
      mockContext.core.opensearch.client.asCurrentUser.transport.request.mock.calls[1];
    expect(secondCall[1]).toEqual({
      requestTimeout: 60000,
      maxRetries: 0,
    });
  });

  it('should return summary on successful prediction', async () => {
    const mockConfigResponse = {
      body: {
        configuration: {
          agent_id: 'agent-123',
        },
      },
    };

    const mockPredictResponse = {
      body: {
        inference_results: [
          {
            output: [
              {
                result: JSON.stringify({
                  output: {
                    message: {
                      content: [{ text: 'This is a test summary' }],
                    },
                  },
                }),
              },
            ],
          },
        ],
      },
    };

    mockContext.core.opensearch.client.asCurrentUser.transport.request
      .mockResolvedValueOnce(mockConfigResponse)
      .mockResolvedValueOnce(mockPredictResponse);

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        summary: 'This is a test summary',
      },
    });
  });

  it('should handle config API errors', async () => {
    const error = new Error('Config API error');
    (error as any).statusCode = 500;

    mockContext.core.opensearch.client.asCurrentUser.transport.request.mockRejectedValueOnce(error);

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Unable to process the request, please try again later.',
      },
    });
  });

  it('should handle predict API errors', async () => {
    const mockConfigResponse = {
      body: {
        configuration: {
          agent_id: 'agent-123',
        },
      },
    };

    const error = new Error('Predict API error');
    (error as any).statusCode = 500;

    mockContext.core.opensearch.client.asCurrentUser.transport.request
      .mockResolvedValueOnce(mockConfigResponse)
      .mockRejectedValueOnce(error);

    await routeHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Unable to process the request, please try again later.',
      },
    });
  });

  it('should support data source ID in query', async () => {
    const mockRequestWithDataSource = {
      ...mockRequest,
      query: {
        dataSourceId: 'ds-123',
      },
    };

    const mockContextWithDataSource = {
      ...mockContext,
      dataSource: {
        opensearch: {
          getClient: jest.fn().mockResolvedValue({
            transport: {
              request: jest
                .fn()
                .mockResolvedValueOnce({
                  body: {
                    configuration: {
                      agent_id: 'agent-123',
                    },
                  },
                })
                .mockResolvedValueOnce({
                  body: {
                    inference_results: [
                      {
                        output: [
                          {
                            result: JSON.stringify({
                              output: {
                                message: {
                                  content: [{ text: 'Test summary' }],
                                },
                              },
                            }),
                          },
                        ],
                      },
                    ],
                  },
                }),
            },
          }),
        },
      },
    };

    await routeHandler(mockContextWithDataSource, mockRequestWithDataSource, mockResponse);

    expect(mockContextWithDataSource.dataSource.opensearch.getClient).toHaveBeenCalledWith(
      'ds-123'
    );
  });

  describe('localTimeZoneOffset parameter', () => {
    it('should include localTimeZoneOffset in ML agent parameters', async () => {
      const mockConfigResponse = {
        body: {
          configuration: {
            agent_id: 'agent-123',
          },
        },
      };

      const mockPredictResponse = {
        body: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    output: {
                      message: {
                        content: [{ text: 'Test summary' }],
                      },
                    },
                  }),
                },
              ],
            },
          ],
        },
      };

      const requestWithOffset = {
        body: {
          visualization: '/9j/4AAQSkZJRgABAQ==',
          localTimeZoneOffset: 480,
        },
        query: {},
      };

      mockContext.core.opensearch.client.asCurrentUser.transport.request
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockPredictResponse);

      await routeHandler(mockContext, requestWithOffset, mockResponse);

      expect(
        mockContext.core.opensearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/_plugins/_ml/agents/agent-123/_execute',
          body: {
            parameters: {
              image_base64: '/9j/4AAQSkZJRgABAQ==',
              local_time_offset: 480,
            },
          },
        }),
        expect.objectContaining({
          requestTimeout: 60000,
          maxRetries: 0,
        })
      );
    });

    it('should handle negative timezone offsets', async () => {
      const mockConfigResponse = {
        body: {
          configuration: {
            agent_id: 'agent-123',
          },
        },
      };

      const mockPredictResponse = {
        body: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    output: {
                      message: {
                        content: [{ text: 'Test summary' }],
                      },
                    },
                  }),
                },
              ],
            },
          ],
        },
      };

      const requestWithNegativeOffset = {
        body: {
          visualization: '/9j/4AAQSkZJRgABAQ==',
          localTimeZoneOffset: -480,
        },
        query: {},
      };

      mockContext.core.opensearch.client.asCurrentUser.transport.request
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockPredictResponse);

      await routeHandler(mockContext, requestWithNegativeOffset, mockResponse);

      expect(
        mockContext.core.opensearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            parameters: {
              image_base64: '/9j/4AAQSkZJRgABAQ==',
              local_time_offset: -480,
            },
          },
        }),
        expect.objectContaining({
          requestTimeout: 60000,
          maxRetries: 0,
        })
      );
    });

    it('should handle zero timezone offset (UTC)', async () => {
      const mockConfigResponse = {
        body: {
          configuration: {
            agent_id: 'agent-123',
          },
        },
      };

      const mockPredictResponse = {
        body: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    output: {
                      message: {
                        content: [{ text: 'Test summary' }],
                      },
                    },
                  }),
                },
              ],
            },
          ],
        },
      };

      const requestWithZeroOffset = {
        body: {
          visualization: '/9j/4AAQSkZJRgABAQ==',
          localTimeZoneOffset: 0,
        },
        query: {},
      };

      mockContext.core.opensearch.client.asCurrentUser.transport.request
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockPredictResponse);

      await routeHandler(mockContext, requestWithZeroOffset, mockResponse);

      expect(
        mockContext.core.opensearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            parameters: {
              image_base64: '/9j/4AAQSkZJRgABAQ==',
              local_time_offset: 0,
            },
          },
        }),
        expect.objectContaining({
          requestTimeout: 60000,
          maxRetries: 0,
        })
      );
    });

    it('should validate localTimeZoneOffset is a number', () => {
      // This test verifies the schema validation accepts numbers
      const routeConfig = mockRouter.post.mock.calls[0][0];
      const bodySchema = routeConfig.validate.body;

      // Valid number should pass validation without error
      const validResult = bodySchema.validate({
        visualization: 'test',
        localTimeZoneOffset: 480,
      });
      expect(validResult.error).toBeUndefined();
    });
  });

  describe('image size limitation', () => {
    it('should reject visualization exceeding max length of 200000', () => {
      const routeConfig = mockRouter.post.mock.calls[0][0];
      const bodySchema = routeConfig.validate.body;

      const oversizedVisualization = 'a'.repeat(200001);
      expect(() =>
        bodySchema.validate({
          visualization: oversizedVisualization,
          localTimeZoneOffset: 480,
        })
      ).toThrow();
    });

    it('should accept visualization at exactly max length of 200000', () => {
      const routeConfig = mockRouter.post.mock.calls[0][0];
      const bodySchema = routeConfig.validate.body;

      const maxVisualization = 'a'.repeat(200000);
      expect(() =>
        bodySchema.validate({
          visualization: maxVisualization,
          localTimeZoneOffset: 480,
        })
      ).not.toThrow();
    });

    it('should reject empty visualization string', () => {
      const routeConfig = mockRouter.post.mock.calls[0][0];
      const bodySchema = routeConfig.validate.body;

      expect(() =>
        bodySchema.validate({
          visualization: '',
          localTimeZoneOffset: 480,
        })
      ).toThrow();
    });
  });

  describe('image format validation', () => {
    it('should accept JPEG base64 images', () => {
      expect(isValidImageFormat('/9j/4AAQSkZJRg==')).toBe(true);
    });

    it('should reject non-JPEG image formats', () => {
      expect(isValidImageFormat('iVBORw0KGgo=')).toBe(false); // PNG
      expect(isValidImageFormat('R0lGODlh')).toBe(false); // GIF
      expect(isValidImageFormat('UklGR')).toBe(false); // WebP
      expect(isValidImageFormat('randomstring')).toBe(false);
    });

    it('should return badRequest for unsupported image format', async () => {
      mockRequest.body.visualization = 'iVBORw0KGgoAAAANSUhEUg==';

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Unsupported image format. Only JPEG is supported.',
        },
      });
    });

    it('should proceed for valid JPEG image', async () => {
      mockRequest.body.visualization = '/9j/4AAQSkZJRgABAQ==';

      mockContext.core.opensearch.client.asCurrentUser.transport.request
        .mockResolvedValueOnce({
          body: { configuration: { agent_id: 'agent-123' } },
        })
        .mockResolvedValueOnce({
          body: {
            inference_results: [
              {
                output: [
                  {
                    result: JSON.stringify({
                      output: { message: { content: [{ text: 'Summary' }] } },
                    }),
                  },
                ],
              },
            ],
          },
        });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { summary: 'Summary' },
      });
    });
  });
});
