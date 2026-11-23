import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { vi } from 'vitest';

// Vitest 5 changed its Assertion type, so jest-dom 6's matcher types no longer
// attach to it. Declare them here the way jest-dom 8 does.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- merged into Vitest's Assertion
  interface Assertion<R, T> extends TestingLibraryMatchers<T, R> {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock IntersectionObserver
// A plain function (not an arrow function) so the mock can be called with `new`.
global.IntersectionObserver = vi.fn().mockImplementation(function (_callback) {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  };
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(function (_callback) {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});