import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest, onRequestPost } from '../../functions/api/share';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('share Pages Function', () => {
  it('returns shareUrl for valid POST requests', async () => {
    const response = await onRequestPost({
      request: new Request('https://playground.openapi-format.com/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          openapi: 'openapi: 3.0.0',
          config: {},
        }),
      }),
    } as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      shareUrl: expect.stringContaining('https://playground.openapi-format.com/'),
    });
  });

  it('returns 405 for non-POST requests', async () => {
    const response = await onRequest({
      request: new Request('https://playground.openapi-format.com/api/share', {
        method: 'GET',
      }),
    } as any);

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      message: 'Method not allowed',
    });
  });

  it('returns 422 when openapi is missing', async () => {
    const response = await onRequestPost({
      request: new Request('https://playground.openapi-format.com/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config: {},
        }),
      }),
    } as any);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: 'Missing openapi or config',
    });
  });

  it('returns 422 when config is missing', async () => {
    const response = await onRequestPost({
      request: new Request('https://playground.openapi-format.com/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          openapi: 'openapi: 3.0.0',
        }),
      }),
    } as any);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: 'Missing openapi or config',
    });
  });

  it('returns 500 when share generation fails', async () => {
    const shareModule = await import('./share');
    vi.spyOn(shareModule, 'generateShareUrl').mockRejectedValueOnce(new Error('boom'));

    const response = await onRequestPost({
      request: new Request('https://playground.openapi-format.com/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          openapi: 'openapi: 3.0.0',
          config: {},
        }),
      }),
    } as any);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: 'Internal server error',
      error: 'boom',
    });
  });
});
