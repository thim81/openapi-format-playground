import { describe, expect, it } from 'vitest';
import { resolveMonacoTheme } from './monacoTheme';

describe('resolveMonacoTheme', () => {
  it('returns vs-dark for dark theme', () => {
    expect(resolveMonacoTheme('dark')).toBe('vs-dark');
  });

  it('returns vs for light theme', () => {
    expect(resolveMonacoTheme('light')).toBe('vs');
  });

  it('returns vs for undefined theme', () => {
    expect(resolveMonacoTheme(undefined)).toBe('vs');
  });
});
