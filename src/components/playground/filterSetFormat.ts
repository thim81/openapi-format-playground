import { parseString, stringify } from '@/lib/openapi-processor';

export async function reformatFilterSet(
  filterSet: string,
  outputLanguage: 'json' | 'yaml'
): Promise<string> {
  if (!filterSet.trim()) return filterSet;
  const parsed = await parseString(filterSet);
  return (await stringify(parsed as any, { format: outputLanguage })) as string;
}
