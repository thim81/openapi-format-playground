import { detectFormat, parseString, stringify } from 'openapi-format';

export type InputDocumentFormat = 'json' | 'yaml' | 'unknown';

export function getInputEditorLanguage(format: InputDocumentFormat): 'json' | 'yaml' {
  return format === 'json' ? 'json' : 'yaml';
}

export async function detectInputDocumentFormat(value: string): Promise<InputDocumentFormat> {
  const detected = await detectFormat(value);
  return detected === 'json' || detected === 'yaml' ? detected : 'unknown';
}

export async function normalizeImportedInput(value: string): Promise<{
  text: string;
  format: InputDocumentFormat;
}> {
  const format = await detectInputDocumentFormat(value);
  if (format === 'unknown') return { text: value, format };

  try {
    const parsed = await parseString(value);
    if (parsed instanceof Error) return { text: value, format };
    const text = await stringify(parsed, { format });
    return { text, format };
  } catch {
    return { text: value, format };
  }
}
