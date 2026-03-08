import { parseString, stringify } from 'openapi-format';

export type SortConfig = Record<string, string[]>;

export async function parseSortConfig(raw: string): Promise<SortConfig> {
  try {
    const parsed = await parseString(raw);
    if (parsed && typeof parsed === 'object') return parsed as SortConfig;
  } catch {
    // ignored: permissive parser returns empty object
  }
  return {};
}

export async function serializeSortConfig(
  config: SortConfig,
  outputLanguage: 'json' | 'yaml',
): Promise<string> {
  return (await stringify(config as any, { format: outputLanguage })) as string;
}
