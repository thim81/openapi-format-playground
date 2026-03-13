import { describe, expect, it } from 'vitest';

import {
  detectInputDocumentFormat,
  getInputEditorLanguage,
  normalizeImportedInput,
} from './inputDocumentFormat';

describe('getInputEditorLanguage', () => {
  it('uses json for detected json input', () => {
    expect(getInputEditorLanguage('json')).toBe('json');
  });

  it('falls back to yaml for yaml and unknown input', () => {
    expect(getInputEditorLanguage('yaml')).toBe('yaml');
    expect(getInputEditorLanguage('unknown')).toBe('yaml');
  });
});

describe('detectInputDocumentFormat', () => {
  it('detects json input', async () => {
    await expect(detectInputDocumentFormat('{"openapi":"3.0.0"}')).resolves.toBe('json');
  });

  it('detects yaml input', async () => {
    await expect(detectInputDocumentFormat('openapi: 3.0.0')).resolves.toBe('yaml');
  });
});

describe('normalizeImportedInput', () => {
  it('pretty-prints imported json as json', async () => {
    const result = await normalizeImportedInput(
      '{"openapi":"3.0.0","info":{"title":"T","version":"1"}}',
    );

    expect(result.format).toBe('json');
    expect(result.text).toContain('\n  "openapi": "3.0.0"');
  });

  it('preserves yaml imports as yaml', async () => {
    const result = await normalizeImportedInput(
      'openapi: 3.0.0\ninfo:\n  title: T\n  version: "1"\n',
    );

    expect(result.format).toBe('yaml');
    expect(result.text).toContain('openapi: 3.0.0');
    expect(result.text).not.toContain('"openapi"');
  });
});
