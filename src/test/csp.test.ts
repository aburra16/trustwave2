import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom applies no Content Security Policy, so a source the policy leaves out would break only in a browser.

const html = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

function policy(): Map<string, string[]> {
  const content = /<meta http-equiv="content-security-policy" content="([^"]*)"/.exec(html)?.[1];
  expect(content).toBeDefined();
  return new Map(
    content!.split(';').map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources] as [string, string[]];
    }),
  );
}

describe('the Content Security Policy', () => {
  it('lets in the look of "Built on Brainstorm" from brainstorm.world as a stylesheet, and as nothing else', () => {
    const directives = policy();
    expect(directives.get('style-src')).toEqual(["'self'", "'unsafe-inline'", 'https://brainstorm.world']);
    expect(directives.get('script-src')).toEqual(["'self'"]);
  });
});
