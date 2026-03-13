export type ImportUrlErrorCode =
  | 'invalid_url'
  | 'blocked_target'
  | 'upstream_error'
  | 'timeout'
  | 'oversized_response'
  | 'fetch_failed';

export interface ImportUrlErrorPayload {
  error: ImportUrlErrorCode;
  message: string;
}

export const IMPORT_URL_TIMEOUT_MS = 15000;
export const IMPORT_URL_MAX_BYTES = 1024 * 1024 * 2;

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'local',
  'internal',
  'metadata.google.internal',
]);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

const PRIVATE_IPV4_RANGES = [
  ['10.0.0.0', '10.255.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255'],
];

const isHex = (value: string) => /^[0-9a-f]+$/i.test(value);

const ipv4ToNumber = (ip: string): number | null => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number.parseInt(part, 10));
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (
    octets[0] * 256 ** 3 + octets[1] * 256 ** 2 + octets[2] * 256 + octets[3]
  );
};

const isPrivateIPv4 = (host: string): boolean => {
  const numeric = ipv4ToNumber(host);
  if (numeric === null) return false;
  return PRIVATE_IPV4_RANGES.some(([start, end]) => {
    const startNum = ipv4ToNumber(start);
    const endNum = ipv4ToNumber(end);
    return startNum !== null && endNum !== null && numeric >= startNum && numeric <= endNum;
  });
};

const expandIpv6 = (ip: string): string[] | null => {
  const normalized = ip.toLowerCase();
  if (normalized.includes(':::')) return null;
  const [left, right] = normalized.split('::');
  const leftParts = left ? left.split(':').filter(Boolean) : [];
  const rightParts = right ? right.split(':').filter(Boolean) : [];
  if ([...leftParts, ...rightParts].some((part) => !isHex(part) || part.length > 4)) return null;
  if (right === undefined) {
    return leftParts.length === 8 ? leftParts.map((part) => part.padStart(4, '0')) : null;
  }
  const missing = 8 - (leftParts.length + rightParts.length);
  if (missing < 0) return null;
  return [
    ...leftParts.map((part) => part.padStart(4, '0')),
    ...new Array(missing).fill('0000'),
    ...rightParts.map((part) => part.padStart(4, '0')),
  ];
};

const isPrivateIPv6 = (host: string): boolean => {
  const expanded = expandIpv6(host);
  if (!expanded) return false;
  const first = Number.parseInt(expanded[0], 16);
  if (expanded.every((part) => part === '0000')) return true;
  if (
    expanded[0] === '0000' &&
    expanded.slice(1, 7).every((part) => part === '0000') &&
    expanded[7] === '0001'
  ) {
    return true;
  }
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  return false;
};

export const normalizeImportUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('https://github.com/') && trimmed.includes('/blob/')) {
    return trimmed
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  return trimmed;
};

export const validateImportUrl = (
  rawUrl: string,
): { ok: true; url: URL } | { ok: false; payload: ImportUrlErrorPayload } => {
  const normalized = normalizeImportUrl(rawUrl);
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return {
      ok: false,
      payload: { error: 'invalid_url', message: 'Please enter a valid URL.' },
    };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return {
      ok: false,
      payload: { error: 'invalid_url', message: 'Only HTTP(S) URLs are supported.' },
    };
  }

  const host = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTS.has(host) ||
    BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix)) ||
    isPrivateIPv4(host) ||
    isPrivateIPv6(host)
  ) {
    return {
      ok: false,
      payload: { error: 'blocked_target', message: 'Private hosts are blocked.' },
    };
  }

  return { ok: true, url };
};

export const jsonError = (payload: ImportUrlErrorPayload, status: number): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export const readResponseTextWithLimit = async (
  response: Response,
  maxBytes = IMPORT_URL_MAX_BYTES,
): Promise<string> => {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('oversized_response');
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
};
