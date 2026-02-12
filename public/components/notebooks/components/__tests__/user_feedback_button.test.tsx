/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UserFeedbackButton } from '../user_feedback_button';

describe('<UserFeedbackButton />', () => {
  it('renders button and opens popover on click', () => {
    const { getByText } = render(<UserFeedbackButton feedbackSummary="Test feedback" />);

    const button = getByText('User feedback');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(getByText('Test feedback')).toBeInTheDocument();
  });
});
