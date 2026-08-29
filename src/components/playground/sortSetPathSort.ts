import { parseString, stringify } from '@/lib/openapi-processor';

export type PathSortMode = 'original' | 'path' | 'tags';

export type ApplyPathSortResult = {
  sortSet: string;
  recoveredFromInvalidInput: boolean;
};

const PATH_SORT_MODES: PathSortMode[] = ['original', 'path', 'tags'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidSortSet(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(([key, entry]) => {
    if (key === 'sortPathsBy') {
      return typeof entry === 'string' && PATH_SORT_MODES.includes(entry as PathSortMode);
    }
    return isStringArray(entry);
  });
}

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
      if (isValidSortSet(parsed)) {
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
