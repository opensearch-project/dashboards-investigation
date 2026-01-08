/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import { getOSDHttp } from '../../../../../../common/utils';
import { sampleParsedParagraghs1 } from '../../../../../../test/notebooks_constants';
import { ParagraphProps, Paragraph } from '../paragraph';
import { ParagraphStateValue } from '../../../../../../common/state/paragraph_state';
import { MockContextProvider } from '../../../context_provider/context_provider.mock';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  notificationServiceMock,
  uiSettingsServiceMock,
} from '../../../../../../../../src/core/public/mocks';
import { NotebookType } from '../../../../../../common/types/notebooks';

jest.mock('../../../../../../../../src/plugins/embeddable/public', () => ({
  ViewMode: {
    EDIT: 'edit',
    VIEW: 'view',
  },
}));

jest.mock('../../data_distribution/data_distribution_container', () => ({
  DataDistributionContainer: () => <div />,
}));

jest.mock('../../topology', () => ({
  Topology: () => <div data-test-subj="topology-component" />,
}));

const mockFind = jest.fn().mockResolvedValue({
  savedObjects: [],
});

const mockUseParams = jest.fn().mockReturnValue({ id: 'test-notebook-id' });
const mockLocation = { href: 'http://localhost/notebook/test-notebook-id' };

jest.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../public/services', () => ({
  getDataSourceManagementSetup: jest.fn(() => ({
    dataSourceManagement: {
      ui: { DataSourceSelector: () => <div data-test-sub="dataSourceSelector" /> },
    },
  })),
}));

// Mock Monaco editor completely
jest.mock('@osd/monaco', () => ({
  monaco: jest.fn(),
}));

jest.mock('../../../../../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  ...jest.requireActual('../../../../../../../../src/plugins/opensearch_dashboards_react/public'),
  CodeEditor: () => <div data-test-subj="code-editor" />,
}));

const mockHttp = {
  ...getOSDHttp(),
  put: jest.fn().mockResolvedValue({}),
};

const mockNotifications = notificationServiceMock.createStartContract();

const ContextAwareParagraphs = (
  props: ParagraphProps & {
    paragraphValues: ParagraphStateValue[];
    notebookType?: NotebookType;
    hypotheses?: any[];
    isNotebookReadonly?: boolean;
  }
) => {
  return (
    <OpenSearchDashboardsContextProvider
      services={{
        http: mockHttp,
        dashboard: {
          DashboardContainerByValueRenderer: jest.fn(),
        },
        savedObjects: { client: { find: mockFind } },
        dataSource: {},
        notifications: mockNotifications,
        uiSettings: uiSettingsServiceMock.createStartContract(),
        paragraphService: {
          getParagraphRegistry: jest.fn().mockImplementation(() => {
            return {
              ParagraphComponent: () => <div data-test-subj="mock-paragraph" />,
            };
          }),
        },
      }}
    >
      <MockContextProvider
        paragraphValues={props.paragraphValues}
        notebookType={props.notebookType}
        hypotheses={props.hypotheses}
        isNotebookReadonly={props.isNotebookReadonly}
      >
        <Paragraph {...props} />
      </MockContextProvider>
    </OpenSearchDashboardsContextProvider>
  );
};

describe('<Paragraph /> spec', () => {
  configure({ adapter: new Adapter() });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
  });

  it('renders classic notebook paragraph', () => {
    const utils = render(
      <ContextAwareParagraphs
        index={0}
        deletePara={jest.fn()}
        scrollToPara={jest.fn()}
        notebookType={NotebookType.CLASSIC}
        paragraphValues={[
          {
            ...sampleParsedParagraghs1[0],
            input: { inputType: 'CODE', inputText: '%md # Type your input here' },
            dateCreated: '',
            dateModified: '',
            id: 'para-1',
          },
        ]}
      />
    );
    expect(utils.getByTestId('mock-paragraph')).toBeInTheDocument();
  });

  it('renders agentic notebook paragraph with finding header', () => {
    const utils = render(
      <ContextAwareParagraphs
        index={0}
        notebookType={NotebookType.AGENTIC}
        paragraphValues={[
          {
            input: {
              inputType: 'CODE',
              inputText: 'test',
              parameters: { finding: { title: 'Test Finding' } },
            },
            output: [{ outputType: 'MARKDOWN', result: 'output' }],
            dateCreated: '',
            dateModified: '2024-01-01',
            id: 'para-1',
            aiGenerated: true,
          },
        ]}
        hypotheses={[]}
      />
    );
    expect(utils.getByTestId('mock-paragraph')).toBeInTheDocument();
  });

  it('hides action panel when notebook is readonly', () => {
    const { container } = render(
      <ContextAwareParagraphs
        index={0}
        notebookType={NotebookType.AGENTIC}
        isNotebookReadonly={true}
        paragraphValues={[
          {
            input: { inputType: 'CODE', inputText: 'test' },
            dateCreated: '',
            dateModified: '',
            id: 'para-1',
          },
        ]}
      />
    );
    expect(container.querySelector('.notebookParagraphWrapper')).toBeInTheDocument();
  });

  it('renders topology when input contains topology pattern', () => {
    const utils = render(
      <ContextAwareParagraphs
        index={0}
        notebookType={NotebookType.AGENTIC}
        paragraphValues={[
          {
            input: { inputType: 'CODE', inputText: '┌──────────' },
            dateCreated: '',
            dateModified: '',
            id: 'para-1',
          },
        ]}
      />
    );
    expect(utils.getByTestId('topology-component')).toBeInTheDocument();
  });

  it('returns null when paragraph is not found', () => {
    const { container } = render(<ContextAwareParagraphs index={5} paragraphValues={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
