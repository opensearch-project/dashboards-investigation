/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlternativeHypothesesPanel } from './alternative_hypotheses_panel';

// Mock all the dependencies
jest.mock('react-use', () => ({
  useObservable: jest.fn(() => ({ hypotheses: [] })),
}));

jest.mock('@osd/i18n', () => ({
  i18n: {
    translate: jest.fn((id: string, options: { defaultMessage: string }) => options.defaultMessage),
  },
}));

jest.mock('../../../../hooks/use_replace_primary_hypothesis', () => ({
  useReplaceAsPrimary: () => ({
    replaceAsPrimary: jest.fn(),
  }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => ({
    state: {
      getValue$: jest.fn(),
      value: { hypotheses: [] },
    },
  })),
}));

describe('AlternativeHypothesesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <AlternativeHypothesesPanel notebookId="test-notebook-123" isInvestigating={false} />
    );
    expect(container).toBeDefined();
  });

  it('should not render when investigating', () => {
    const { container } = render(
      <AlternativeHypothesesPanel notebookId="test-notebook-123" isInvestigating={true} />
    );
    expect(container.firstChild).toBeNull();
  });
});
