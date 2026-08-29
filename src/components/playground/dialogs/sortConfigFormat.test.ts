import { describe, expect, it } from 'vitest';
import { parseSortConfig, serializeSortConfig } from './sortConfigFormat';

describe('sortConfigFormat', () => {
  it('parses JSON sort config', async () => {
    const parsed = await parseSortConfig('{"root":["openapi","info"]}');
    expect(parsed.root).toEqual(['openapi', 'info']);
  });

  it('parses YAML sort config', async () => {
    const parsed = await parseSortConfig('root:\n  - openapi\n  - info\n');
    expect(parsed.root).toEqual(['openapi', 'info']);
  });

  it('returns empty object for invalid config', async () => {
    const parsed = await parseSortConfig('{invalid');
    expect(parsed).toEqual({});
  });

  it('serializes to JSON for json output language', async () => {
    const value = await serializeSortConfig({ root: ['openapi'] }, 'json');
    expect(value.trim().startsWith('{')).toBe(true);
    expect(value).toContain('"root"');
  });

  it('serializes to YAML for yaml output language', async () => {
    const value = await serializeSortConfig({ root: ['openapi'] }, 'yaml');
    expect(value).toContain('root:');
    expect(value).toContain('- openapi');
  });
});
