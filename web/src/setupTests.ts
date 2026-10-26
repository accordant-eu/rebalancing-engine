import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Matchers<R = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<any, R> {}
}
