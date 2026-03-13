import { describe, expect, it } from 'vitest';

import { normalizeOriginalForDiff, resolveDiffEditorLanguage } from './diffEditorLanguage';

describe('resolveDiffEditorLanguage', () => {
  it('always uses the output format for the diff editor language', () => {
    expect(resolveDiffEditorLanguage('yaml')).toBe('yaml');
    expect(resolveDiffEditorLanguage('json')).toBe('json');
  });
});

describe('normalizeOriginalForDiff', () => {
  it('rewrites json input into yaml for yaml diff comparisons', async () => {
    const normalized = await normalizeOriginalForDiff(
      '{"openapi":"3.0.0","info":{"title":"T","version":"1"}}',
      'yaml',
    );

    expect(normalized).toContain('openapi: 3.0.0');
    expect(normalized).not.toContain('"openapi"');
  });

  it('rewrites yaml input into json for json diff comparisons', async () => {
    const normalized = await normalizeOriginalForDiff(
      'openapi: 3.0.0\ninfo:\n  title: T\n  version: "1"\n',
      'json',
    );

    expect(normalized).toContain('"openapi": "3.0.0"');
  });

  it('falls back to the raw input when parsing fails', async () => {
    const raw = '{not-valid';
    await expect(normalizeOriginalForDiff(raw, 'yaml')).resolves.toBe(raw);
  });
});
