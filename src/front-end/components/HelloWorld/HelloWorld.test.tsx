// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HelloWorld from './HelloWorld';

afterEach(cleanup);

describe('HelloWorld', () => {
  it('renders the default greeting when no message is provided', () => {
    // Arrange: omit the optional message to exercise the default greeting.
    const expectedMessage = 'Hello World!';

    // Act
    render(<HelloWorld />);

    // Assert
    expect(screen.getByText(expectedMessage)).toBeTruthy();
  });

  it('replaces the default greeting with the provided message', () => {
    // Arrange: provide a custom greeting.
    const message = 'Welcome to Storybook!';

    // Act
    render(<HelloWorld message={message} />);

    // Assert: only the custom greeting is visible.
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText('Hello World!')).toBeNull();
  });
});
