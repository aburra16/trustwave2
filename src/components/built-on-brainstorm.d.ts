import type { HTMLAttributes } from 'react';

/**
 * The element ./built-on-brainstorm.js defines, for TSX. React 18 sets `className` on a custom
 * element as an attribute of that name, so the element is given `class`, and its type has no
 * `className` to set by mistake.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'built-on-brainstorm': Omit<HTMLAttributes<HTMLElement>, 'className'> & { class?: string };
    }
  }
}
