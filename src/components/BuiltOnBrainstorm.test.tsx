import { createHash } from 'node:crypto';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BuiltOnBrainstorm } from './BuiltOnBrainstorm';

// The line itself. Where each page has it is in MainLayout.test.tsx and NotFound.test.tsx.

const PAGE_TONE = ['[--built-on-color:hsl(var(--muted-foreground))]', '[--built-on-hover-color:hsl(var(--foreground))]'];
const FOCUS = '[--built-on-focus-color:hsl(var(--ring))]';

function drawn(element: Parameters<typeof render>[0]) {
  const { container } = render(element);
  const host = container.querySelector('built-on-brainstorm')!;
  expect(host).not.toBeNull();
  const root = host.shadowRoot!;
  return { host, root, link: root.querySelector('a')! };
}

describe('BuiltOnBrainstorm', () => {
  it('is one link to brainstorm.world, opened in a new tab, which is told nothing of where the person came from', () => {
    const { root, link } = drawn(<BuiltOnBrainstorm />);
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(link).toHaveAttribute('href', 'https://brainstorm.world');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it("says 'Built on Brainstorm', and to a screen reader that it opens in a new tab", () => {
    const { link } = drawn(<BuiltOnBrainstorm />);
    expect(link).toHaveAccessibleName('Built on Brainstorm (opens in a new tab)');
    expect(link.querySelector('[part="words"]')).toHaveTextContent(/^Built on Brainstorm$/);
  });

  it("draws Brainstorm's mark before the words, as Brainstorm draws it, in the colour of the words, hidden from a screen reader", () => {
    const { link } = drawn(<BuiltOnBrainstorm />);
    const mark = link.querySelector('svg')!;
    expect(link.firstElementChild).toBe(mark);
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('viewBox', '0 0 71 73');
    expect(mark).toHaveAttribute('fill', 'currentColor');
    const path = mark.querySelector('path')!.getAttribute('d')!;
    expect(path).toHaveLength(2280);
    expect(createHash('sha256').update(path).digest('hex')).toBe('1cb58d464345120ce16678221fff92cb0f3f3dea709145d6c350143f0695b9f4');
  });

  it("takes its look from brainstorm.world, which index.html's policy lets in (src/test/csp.test.ts)", () => {
    const { root } = drawn(<BuiltOnBrainstorm />);
    expect(root.querySelector('link[rel="stylesheet"]')).toHaveAttribute('href', 'https://brainstorm.world/built-on/v1.css');
  });

  it('gets its hooks through `class`, which React 18 sets on a custom element, never a `className` attribute', () => {
    const { host } = drawn(<BuiltOnBrainstorm />);
    expect(host).toHaveClass('text-xs', FOCUS, ...PAGE_TONE);
    expect(host).not.toHaveAttribute('className');
  });

  it("on the 404 page's plain gray ground, is in that page's own grays", () => {
    const { host } = drawn(<BuiltOnBrainstorm tone="plain" />);
    expect(host).toHaveClass(
      'text-xs',
      FOCUS,
      '[--built-on-color:theme(colors.gray.600)]',
      '[--built-on-hover-color:theme(colors.gray.900)]',
      'dark:[--built-on-color:theme(colors.gray.400)]',
      'dark:[--built-on-hover-color:theme(colors.gray.100)]',
    );
    expect(host).not.toHaveClass(...PAGE_TONE);
  });

  it('takes the room it is given where it sits', () => {
    const { host } = drawn(<BuiltOnBrainstorm className="mt-2 text-sm" />);
    expect(host).toHaveClass('mt-2', 'text-sm', ...PAGE_TONE);
    expect(host).not.toHaveClass('text-xs');
  });
});
