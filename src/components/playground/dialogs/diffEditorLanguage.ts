import { parseString, stringify } from '@/lib/openapi-processor';

export function resolveDiffEditorLanguage(outputFormat: 'json' | 'yaml'): 'json' | 'yaml' {
  return outputFormat;
}

function isLikelyOpenApiDocument(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const doc = value as Record<string, unknown>;
  return (
    (typeof doc.openapi === 'string' && doc.openapi.length > 0) ||
    (typeof doc.swagger === 'string' && doc.swagger.length > 0)
  );
}

export async function normalizeOriginalForDiff(
  original: string,
  outputFormat: 'json' | 'yaml',
): Promise<string> {
  try {
    const parsed = await parseString(original);
    if (!isLikelyOpenApiDocument(parsed)) {
      return original;
    }
    return (await stringify(parsed as any, { format: outputFormat })) as string;
  } catch {
    return original;
  }
}
