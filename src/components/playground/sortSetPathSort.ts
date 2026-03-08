import { parseString, stringify } from '@/lib/openapi-processor';

export type PathSortMode = 'original' | 'path' | 'tags';

export type ApplyPathSortResult = {
  sortSet: string;
  recoveredFromInvalidInput: boolean;
};

export async function applyPathSortToSortSet(
  sortSetStr: string,
  newPathSort: PathSortMode,
  outputLanguage: 'json' | 'yaml',
): Promise<ApplyPathSortResult> {
  let sortSetObj: Record<string, unknown> = {};
  let recoveredFromInvalidInput = false;

  const raw = sortSetStr?.trim();
  if (raw) {
    try {
      const parsed = await parseString(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        !(parsed instanceof Error)
      ) {
        sortSetObj = parsed as Record<string, unknown>;
      } else {
        recoveredFromInvalidInput = true;
      }
    } catch {
      recoveredFromInvalidInput = true;
    }
  }

  if (newPathSort === 'original') {
    delete sortSetObj.sortPathsBy;
  } else {
    sortSetObj.sortPathsBy = newPathSort;
  }

  if (Object.keys(sortSetObj).length === 0) {
    return { sortSet: '', recoveredFromInvalidInput };
  }

  const serialized = (await stringify(sortSetObj as any, { format: outputLanguage })) as string;
  return { sortSet: serialized, recoveredFromInvalidInput };
}
