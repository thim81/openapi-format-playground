import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequestGet } from '../../functions/api/import';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('import Pages Function', () => {
  it('rejects missing URLs', async () => {
    const response = await onRequestGet({
      request: new Request('https://playground.openapi-format.com/api/import'),
    } as any);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'invalid_url',
    });
  });

  it('rejects blocked private targets', async () => {
    const response = await onRequestGet({
      request: new Request(
        'https://playground.openapi-format.com/api/import?url=http://127.0.0.1/openapi.yaml',
      ),
    } as any);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'blocked_target',
    });
  });

  it('returns upstream text for public HTTPS targets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('openapi: 3.0.3', {
          status: 200,
          headers: { 'content-type': 'application/yaml' },
        }),
      ),
    );

    const response = await onRequestGet({
      request: new Request(
        'https://playground.openapi-format.com/api/import?url=https://example.com/openapi.yaml',
      ),
    } as any);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('openapi: 3.0.3');
  });

  it('returns a timeout error when the upstream request aborts', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const response = await onRequestGet({
      request: new Request(
        'https://playground.openapi-format.com/api/import?url=https://example.com/openapi.yaml',
      ),
    } as any);

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: 'timeout',
    });
  });

  it('returns an oversized response error when the upstream body exceeds the limit', async () => {
    const oversized = 'x'.repeat(1024 * 1024 * 2 + 1);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(oversized, {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    const response = await onRequestGet({
      request: new Request(
        'https://playground.openapi-format.com/api/import?url=https://example.com/openapi.yaml',
      ),
    } as any);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: 'oversized_response',
    });
  });
});
