export function resolveDiffEditorLanguage(outputFormat: 'json' | 'yaml'): 'json' | 'yaml' {
  return outputFormat;
}

export async function normalizeOriginalForDiff(
  original: string,
  _outputFormat: 'json' | 'yaml',
): Promise<string> {
  return original;
}
