/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import { InvestigationPageContext } from '../investigation_page_context';
import { investigationNotebookID } from '../../../../../common/constants/shared';

describe('<InvestigationPageContext /> spec', () => {
  const mockUsePageContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls usePageContext with correct parameters without dataSourceId', () => {
    render(<InvestigationPageContext usePageContext={mockUsePageContext} />);

    expect(mockUsePageContext).toHaveBeenCalledTimes(1);
    expect(mockUsePageContext).toHaveBeenCalledWith({
      description: 'Investigation notebooks application page context',
      convert: expect.any(Function),
      categories: ['static', investigationNotebookID],
    });

    // Test the convert function returns correct structure without dataSourceId
    const convertFn = mockUsePageContext.mock.calls[0][0].convert;
    const result = convertFn();

    expect(result).toEqual({
      appId: investigationNotebookID,
      dataset: {
        dataSource: { id: undefined },
      },
    });
  });

  it('calls usePageContext with correct parameters with dataSourceId', () => {
    const testDataSourceId = 'test-datasource-123';

    render(
      <InvestigationPageContext
        usePageContext={mockUsePageContext}
        dataSourceId={testDataSourceId}
      />
    );

    expect(mockUsePageContext).toHaveBeenCalledTimes(1);
    expect(mockUsePageContext).toHaveBeenCalledWith({
      description: 'Investigation notebooks application page context',
      convert: expect.any(Function),
      categories: ['static', investigationNotebookID],
    });

    // Test the convert function returns correct structure with dataSourceId
    const convertFn = mockUsePageContext.mock.calls[0][0].convert;
    const result = convertFn();

    expect(result).toEqual({
      appId: investigationNotebookID,
      dataset: {
        dataSource: { id: testDataSourceId },
      },
    });
  });
});
