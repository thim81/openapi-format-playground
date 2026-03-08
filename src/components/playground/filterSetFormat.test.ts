import { describe, expect, it } from 'vitest';
import { reformatFilterSet } from './filterSetFormat';

describe('reformatFilterSet', () => {
  it('converts yaml filter set to json', async () => {
    const yaml = 'paths:\n  - $.paths[*]\n';
    const json = await reformatFilterSet(yaml, 'json');
    expect(json.trim().startsWith('{')).toBe(true);
    expect(json).toContain('"paths"');
  });

  it('converts json filter set to yaml', async () => {
    const json = '{\n  "paths": ["$.paths[*]"]\n}\n';
    const yaml = await reformatFilterSet(json, 'yaml');
    expect(yaml).toContain('paths:');
    expect(yaml).toContain('$.paths[*]');
  });
});
