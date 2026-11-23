import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TestApp } from '@/test/TestApp';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { MainLayout } from './MainLayout';

describe('MainLayout', () => {
  it('draws "Built on Brainstorm" once, in a footer after the page', () => {
    render(
      <TestApp>
        <PlayerProvider>
          <MainLayout>
            <p>The page</p>
          </MainLayout>
        </PlayerProvider>
      </TestApp>
    );

    const lines = document.querySelectorAll('built-on-brainstorm');
    expect(lines).toHaveLength(1);
    const footer = lines[0].closest('footer')!;
    expect(footer).not.toBeNull();
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByText('The page'));
    expect(main).not.toContainElement(footer);
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
