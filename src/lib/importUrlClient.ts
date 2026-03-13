import { normalizeImportUrl, type ImportUrlErrorPayload } from './importUrlShared';

export const buildImportUrlProxyPath = (url: string): string =>
  `/api/import-url?url=${encodeURIComponent(normalizeImportUrl(url))}`;

export const importTextFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(buildImportUrlProxyPath(url));
  if (response.ok) return await response.text();

  let payload: ImportUrlErrorPayload | null = null;
  try {
    payload = (await response.json()) as ImportUrlErrorPayload;
  } catch {
    payload = null;
  }

  throw new Error(payload?.message || `Could not import URL content (HTTP ${response.status}).`);
};
