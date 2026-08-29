import { describe, expect, it, vi, afterEach } from 'vitest';

import { buildImportUrlProxyPath, importTextFromUrl } from './importUrlClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildImportUrlProxyPath', () => {
  it('encodes the remote URL into the proxy endpoint', () => {
    expect(buildImportUrlProxyPath('https://example.com/openapi.yaml?x=1')).toBe(
      '/api/import?url=https%3A%2F%2Fexample.com%2Fopenapi.yaml%3Fx%3D1',
    );
  });

  it('converts GitHub blob URLs to raw URLs', () => {
    expect(buildImportUrlProxyPath('https://github.com/org/repo/blob/main/openapi.yaml')).toContain(
      encodeURIComponent('https://raw.githubusercontent.com/org/repo/main/openapi.yaml'),
    );
  });
});

describe('importTextFromUrl', () => {
  it('returns response text for successful proxy responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('openapi: 3.0.3', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    await expect(importTextFromUrl('https://example.com/spec.yaml')).resolves.toBe(
      'openapi: 3.0.3',
    );
  });

  it('surfaces normalized proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'blocked_target', message: 'Private hosts are blocked.' }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    await expect(importTextFromUrl('https://127.0.0.1/spec.yaml')).rejects.toThrow(
      'Private hosts are blocked.',
    );
  });
});
