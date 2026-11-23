import { cn } from '@/lib/utils';
import './built-on-brainstorm.js';

/**
 * Brainstorm's shared line, `<built-on-brainstorm>` (./built-on-brainstorm.js, copied as Brainstorm
 * gives it). It draws Brainstorm's mark and the words, one link to brainstorm.world, in a shadow root
 * of its own, and takes its look from brainstorm.world, which index.html's policy lets in as a
 * stylesheet. The app gives it its size and colours through the properties the line reads, set
 * with `class` (./built-on-brainstorm.d.ts says why).
 */

/**
 * The line's colours, by the ground it is on: the app's pages (the muted text colour, and the text
 * colour when pointed at or focused), or the 404 page's plain gray ground (its paragraph's gray, and
 * its heading's).
 */
const TONES = {
  page: '[--built-on-color:hsl(var(--muted-foreground))] [--built-on-hover-color:hsl(var(--foreground))]',
  plain:
    '[--built-on-color:theme(colors.gray.600)] [--built-on-hover-color:theme(colors.gray.900)] dark:[--built-on-color:theme(colors.gray.400)] dark:[--built-on-hover-color:theme(colors.gray.100)]',
} as const;

/**
 * "Built on Brainstorm", the quiet line at the foot of every page: a caption, with the app's focus
 * ring. MainLayout draws it under every page it frames, and NotFound under its own.
 */
export function BuiltOnBrainstorm({ tone = 'page', className }: { tone?: keyof typeof TONES; className?: string }) {
  return (
    <built-on-brainstorm
      class={cn('text-xs [--built-on-focus-color:hsl(var(--ring))]', TONES[tone], className)}
    />
  );
}
