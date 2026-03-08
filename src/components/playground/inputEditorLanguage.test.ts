import { describe, expect, it } from 'vitest';
import { getInputEditorLanguage } from './inputEditorLanguage';

describe('getInputEditorLanguage', () => {
  it('keeps input editor in yaml when output format is yaml', () => {
    expect(getInputEditorLanguage('yaml')).toBe('yaml');
  });

  it('keeps input editor in yaml when output format is json', () => {
    expect(getInputEditorLanguage('json')).toBe('yaml');
  });
});
