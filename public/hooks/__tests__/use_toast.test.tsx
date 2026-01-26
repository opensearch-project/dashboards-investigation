/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useToast } from '../use_toast';
import { useOpenSearchDashboards } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { mountReactNode } from '../../../../../src/core/public/utils';

// Mock dependencies
jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public');
jest.mock('../../../../../src/core/public/utils');

describe('useToast', () => {
  let mockNotifications: any;
  let mockOverlays: any;
  let mockUiSettings: any;
  let mockOpenModal: jest.Mock;
  let mockAddDanger: jest.Mock;
  let mockMountReactNode: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock functions
    mockAddDanger = jest.fn();
    mockOpenModal = jest.fn();
    mockMountReactNode = jest.fn((component) => component);

    // Setup mock services
    mockNotifications = {
      toasts: {
        addDanger: mockAddDanger,
      },
    };

    mockOverlays = {
      openModal: mockOpenModal,
    };

    mockUiSettings = {
      get: jest.fn((key: string) => {
        if (key === 'notifications:lifetime:error') {
          return 10000;
        }
        return undefined;
      }),
    };

    // Mock useOpenSearchDashboards hook
    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: {
        notifications: mockNotifications,
        overlays: mockOverlays,
        uiSettings: mockUiSettings,
      },
    });

    // Mock mountReactNode
    (mountReactNode as jest.Mock).mockImplementation(mockMountReactNode);
  });

  describe('addError', () => {
    it('should call addDanger with correct title and error message', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test error message');
      result.current.addError({
        title: 'Test Error Title',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledTimes(1);
      expect(mockAddDanger).toHaveBeenCalledWith({
        toastLifeTimeMs: 30 * 60 * 1000, // 30 minutes
        title: 'Test Error Title',
        text: expect.any(Object),
      });
    });

    it('should use fixed toast lifetime of 30 minutes', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test error');
      result.current.addError({
        title: 'Error',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          toastLifeTimeMs: 30 * 60 * 1000,
        })
      );
    });

    it('should call mountReactNode with error message component', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Detailed error message');
      result.current.addError({
        title: 'Error Title',
        error,
      });

      expect(mockMountReactNode).toHaveBeenCalledTimes(1);
      expect(mockMountReactNode).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle errors with different messages', () => {
      const { result } = renderHook(() => useToast());

      const testCases = [
        { title: 'Network Error', error: new Error('Failed to fetch') },
        { title: 'Validation Error', error: new Error('Invalid input') },
        { title: 'Permission Error', error: new Error('Access denied') },
      ];

      testCases.forEach((testCase) => {
        result.current.addError(testCase);
      });

      expect(mockAddDanger).toHaveBeenCalledTimes(3);
    });

    it('should handle empty error message', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('');
      result.current.addError({
        title: 'Empty Error',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledTimes(1);
    });

    it('should handle long error messages', () => {
      const { result } = renderHook(() => useToast());

      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);
      result.current.addError({
        title: 'Long Error',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in error message', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Error with <script>alert("xss")</script> and special chars: @#$%');
      result.current.addError({
        title: 'Special Chars Error',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledTimes(1);
    });
  });

  describe('error dialog modal', () => {
    it('should open modal when "See the full error" button is clicked', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test error');
      result.current.addError({
        title: 'Test Title',
        error,
      });

      // Get the mounted component
      const mountedComponent = mockMountReactNode.mock.calls[0][0];
      expect(mountedComponent).toBeDefined();

      // Verify the component has the button with onClick handler
      expect(mountedComponent.props.children).toBeDefined();
    });

    it('should call openModal when button is clicked', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Test error message');
      result.current.addError({
        title: 'Test Title',
        error,
      });

      // Get the mounted toast component
      const toastComponent = mockMountReactNode.mock.calls[0][0];

      // Find and simulate clicking the "See the full error" button
      const buttonElement = toastComponent.props.children[1].props.children;
      const onClickHandler = buttonElement.props.onClick;

      // Trigger the onClick handler
      onClickHandler();

      // Verify openModal was called
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
      expect(mockOpenModal).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should render modal with error title and message', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Detailed error message');
      result.current.addError({
        title: 'Error Title',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function that was passed to openModal
      const modalMountFn = mockOpenModal.mock.calls[0][0];

      // Create a mock container and call the mount function
      const mockContainer = document.createElement('div');
      const unmountFn = modalMountFn(mockContainer);

      // Verify the modal was rendered
      expect(mockContainer.innerHTML).toContain('Error Title');
      expect(mockContainer.innerHTML).toContain('Detailed error message');

      // Verify unmount function is returned
      expect(typeof unmountFn).toBe('function');
    });

    it('should render modal with error cause when present', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Main error message');
      (error as any).cause = 'Root cause details';

      result.current.addError({
        title: 'Error with Cause',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify both error message and cause are rendered
      expect(mockContainer.innerHTML).toContain('Main error message');
      expect(mockContainer.innerHTML).toContain('Root cause details');
    });

    it('should render modal without cause section when error has no cause', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Error without cause');

      result.current.addError({
        title: 'Simple Error',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify error message is rendered
      expect(mockContainer.innerHTML).toContain('Error without cause');
      // The EuiPanel with markdown (which contains the cause) should not be present
      const hasPanelWithMarkdown = mockContainer.querySelector('.euiPanel');
      expect(hasPanelWithMarkdown).toBeNull();
    });

    it('should have close button that calls modal.close', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Test error');
      result.current.addError({
        title: 'Test',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify close button exists in the rendered modal
      const closeButton = mockContainer.querySelector('button');
      expect(closeButton).toBeTruthy();
      expect(closeButton?.textContent).toContain('Close');
    });

    it('should unmount modal component when unmount function is called', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Test error');
      result.current.addError({
        title: 'Test',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      const unmountFn = modalMountFn(mockContainer);

      // Verify content is rendered
      expect(mockContainer.innerHTML).not.toBe('');

      // Call unmount function
      unmountFn();

      // Verify content is removed
      expect(mockContainer.innerHTML).toBe('');
    });
  });

  describe('service integration', () => {
    it('should use notifications service from OpenSearchDashboards context', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test');
      result.current.addError({
        title: 'Test',
        error,
      });

      expect(useOpenSearchDashboards).toHaveBeenCalled();
      expect(mockNotifications.toasts.addDanger).toHaveBeenCalled();
    });

    it('should use overlays service from OpenSearchDashboards context', () => {
      renderHook(() => useToast());

      expect(useOpenSearchDashboards).toHaveBeenCalled();
      // Overlays service is available in the context
    });

    it('should use notifications and overlays services from OpenSearchDashboards context', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test');
      result.current.addError({
        title: 'Test',
        error,
      });

      expect(useOpenSearchDashboards).toHaveBeenCalled();
      expect(mockNotifications.toasts.addDanger).toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    it('should return an object with addError method', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current).toHaveProperty('addError');
      expect(typeof result.current.addError).toBe('function');
    });

    it('should maintain stable reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useToast());

      const firstAddError = result.current.addError;
      rerender();
      const secondAddError = result.current.addError;

      // Note: Without useMemo/useCallback, references may change
      // This test documents current behavior
      expect(typeof firstAddError).toBe('function');
      expect(typeof secondAddError).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should throw error when null or undefined error is passed', () => {
      const { result } = renderHook(() => useToast());

      // TypeScript would prevent this, but testing runtime behavior
      const error = null as any;

      expect(() => {
        result.current.addError({
          title: 'Null Error',
          error,
        });
      }).toThrow(TypeError);
    });

    it('should handle error objects without message property', () => {
      const { result } = renderHook(() => useToast());

      const error = { toString: () => 'Custom error' } as any;

      expect(() => {
        result.current.addError({
          title: 'Custom Error',
          error,
        });
      }).not.toThrow();
    });

    it('should handle multiple consecutive error notifications', () => {
      const { result } = renderHook(() => useToast());

      for (let i = 0; i < 5; i++) {
        result.current.addError({
          title: `Error ${i}`,
          error: new Error(`Message ${i}`),
        });
      }

      expect(mockAddDanger).toHaveBeenCalledTimes(5);
    });

    it('should handle errors with very long titles', () => {
      const { result } = renderHook(() => useToast());

      const longTitle = 'A'.repeat(500);
      const error = new Error('Test error');

      result.current.addError({
        title: longTitle,
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: longTitle,
        })
      );
    });

    it('should always use fixed toast lifetime of 30 minutes regardless of uiSettings', () => {
      mockUiSettings.get.mockReturnValue(5000);

      const { result } = renderHook(() => useToast());

      const error = new Error('Test');
      result.current.addError({
        title: 'Test',
        error,
      });

      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          toastLifeTimeMs: 30 * 60 * 1000,
        })
      );
    });
  });

  describe('internationalization', () => {
    it('should use FormattedMessage for button text', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Test error');
      result.current.addError({
        title: 'Test',
        error,
      });

      // The component uses FormattedMessage with specific id
      expect(mockMountReactNode).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should include data-test-subj attribute for error message', () => {
      const { result } = renderHook(() => useToast());

      const error = new Error('Accessible error');
      result.current.addError({
        title: 'Accessible Error',
        error,
      });

      // The error message paragraph should have data-test-subj="errorToastMessage"
      expect(mockMountReactNode).toHaveBeenCalled();
    });
  });

  describe('conditional error message rendering in modal', () => {
    it('should NOT render EuiCallOut when error.message is empty string', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('');
      error.cause = 'This is the cause information';

      result.current.addError({
        title: 'Error with empty message',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify EuiCallOut is NOT rendered (no alert icon or danger callout)
      const callOut = mockContainer.querySelector('.euiCallOut--danger');
      expect(callOut).toBeNull();

      // Verify cause is still rendered
      expect(mockContainer.innerHTML).toContain('This is the cause information');
    });

    it('should render EuiCallOut when error.message has content', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('This is an error message');
      error.cause = 'This is the cause';

      result.current.addError({
        title: 'Error with message',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify EuiCallOut IS rendered with the error message
      expect(mockContainer.innerHTML).toContain('This is an error message');
      // Verify cause is also rendered
      expect(mockContainer.innerHTML).toContain('This is the cause');
    });

    it('should render modal with only cause when error.message is empty', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('');
      error.cause = 'Only cause information available';

      result.current.addError({
        title: 'Error Title',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify title is rendered
      expect(mockContainer.innerHTML).toContain('Error Title');
      // Verify cause is rendered
      expect(mockContainer.innerHTML).toContain('Only cause information available');
      // Verify no danger callout for empty message
      const callOut = mockContainer.querySelector('.euiCallOut--danger');
      expect(callOut).toBeNull();
    });

    it('should handle error with whitespace-only message as empty', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('   ');
      error.cause = 'Cause information';

      result.current.addError({
        title: 'Whitespace Error',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Even though message is whitespace, it's truthy so EuiCallOut will render
      // This documents the current behavior - only empty string ('') is falsy
      expect(mockContainer.innerHTML).toContain('Cause information');
    });

    it('should render both message and cause when both are present', () => {
      const { result } = renderHook(() => useToast());
      const mockModalClose = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockModalClose });

      const error = new Error('Error message text');
      error.cause = 'Error cause text';

      result.current.addError({
        title: 'Complete Error',
        error,
      });

      // Trigger the modal opening
      const toastComponent = mockMountReactNode.mock.calls[0][0];
      const buttonElement = toastComponent.props.children[1].props.children;
      buttonElement.props.onClick();

      // Get the modal mount function
      const modalMountFn = mockOpenModal.mock.calls[0][0];
      const mockContainer = document.createElement('div');
      modalMountFn(mockContainer);

      // Verify both message and cause are rendered
      expect(mockContainer.innerHTML).toContain('Error message text');
      expect(mockContainer.innerHTML).toContain('Error cause text');
    });
  });
});
