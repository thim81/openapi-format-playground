import { describe, expect, test } from 'vitest';
import { applyPathSortToSortSet } from './sortSetPathSort';
import { parseString } from '@/lib/openapi-processor';

describe('applyPathSortToSortSet', () => {
  test('sets sortPathsBy=path from empty sort set', async () => {
    const result = await applyPathSortToSortSet('', 'path', 'yaml');
    const parsed = await parseString(result.sortSet);
    expect((parsed as any).sortPathsBy).toBe('path');
    expect(result.recoveredFromInvalidInput).toBe(false);
  });

  test('removes sortPathsBy when switching to original', async () => {
    const result = await applyPathSortToSortSet('sortPathsBy: tags\n', 'original', 'yaml');
    expect(result.sortSet).toBe('');
  });

  test('recovers from invalid sort set text and still applies selection', async () => {
    const result = await applyPathSortToSortSet(':\n', 'tags', 'yaml');
    const parsed = await parseString(result.sortSet);
    expect((parsed as any).sortPathsBy).toBe('tags');
    expect(result.recoveredFromInvalidInput).toBe(true);
  });
});
