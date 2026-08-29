import { describe, expect, it } from 'vitest';

import { normalizeOriginalForDiff, resolveDiffEditorLanguage } from './diffEditorLanguage';

describe('resolveDiffEditorLanguage', () => {
  it('always uses the output format for the diff editor language', () => {
    expect(resolveDiffEditorLanguage('yaml')).toBe('yaml');
    expect(resolveDiffEditorLanguage('json')).toBe('json');
  });
});

describe('normalizeOriginalForDiff', () => {
  it('returns the raw input unchanged', async () => {
    const raw = '{"openapi":"3.0.0","info":{"title":"T","version":"1"}}';
    await expect(normalizeOriginalForDiff(raw, 'yaml')).resolves.toBe(raw);
  });
});
