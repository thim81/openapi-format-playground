import { parseString, stringify } from '@/lib/openapi-processor';

export function resolveDiffEditorLanguage(outputFormat: 'json' | 'yaml'): 'json' | 'yaml' {
  return outputFormat;
}

export async function normalizeOriginalForDiff(
  original: string,
  outputFormat: 'json' | 'yaml',
): Promise<string> {
  try {
    const parsed = await parseString(original);
    if (
      parsed instanceof Error ||
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return original;
    }
    return (await stringify(parsed as any, { format: outputFormat })) as string;
  } catch {
    return original;
  }
}
