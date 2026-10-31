import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TestApp } from '@/test/TestApp';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('draws "Built on Brainstorm" once, in its own grays, in a footer under what it says', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestApp>
        <NotFound />
      </TestApp>
    );

    const lines = document.querySelectorAll('built-on-brainstorm');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveClass('[--built-on-color:theme(colors.gray.600)]');
    const footer = lines[0].closest('footer')!;
    expect(footer).not.toBeNull();
    const message = screen.getByText('Oops! Page not found');
    expect(footer).not.toContainElement(message);
    expect(message.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    consoleSpy.mockRestore();
  });
});
