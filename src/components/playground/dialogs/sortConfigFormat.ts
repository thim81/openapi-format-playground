import { parseString, stringify } from 'openapi-format';

export type SortConfig = Record<string, string[]>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidSortConfig(value: unknown): value is SortConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(isStringArray);
}

export async function parseSortConfig(raw: string): Promise<SortConfig> {
  try {
    const parsed = await parseString(raw);
    if (isValidSortConfig(parsed)) return parsed;
  } catch {
    // ignored: permissive parser can throw on malformed content
  }
  return {};
}

export async function serializeSortConfig(
  config: SortConfig,
  outputLanguage: 'json' | 'yaml',
): Promise<string> {
  return (await stringify(config as any, { format: outputLanguage })) as string;
}
