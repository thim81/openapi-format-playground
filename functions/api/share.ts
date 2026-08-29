import { generateShareUrl, type PlaygroundConfig } from '../../src/lib/share';

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export const onRequest = async (context: { request: Request }): Promise<Response> => {
  if (context.request.method !== 'POST') {
    return json({ message: 'Method not allowed' }, 405);
  }

  return onRequestPost(context);
};

export const onRequestPost = async (context: { request: Request }): Promise<Response> => {
  try {
    const body = await context.request.json();
    const openapi = typeof body?.openapi === 'string' ? body.openapi : '';
    const hasConfig = body && Object.prototype.hasOwnProperty.call(body, 'config');
    const config = body?.config as PlaygroundConfig | undefined;

    if (!openapi || !hasConfig) {
      return json({ message: 'Missing openapi or config' }, 422);
    }

    const requestUrl = new URL(context.request.url);
    const protocol =
      context.request.headers.get('x-forwarded-proto') ||
      requestUrl.protocol.replace(':', '') ||
      'https';
    const host = context.request.headers.get('host') || requestUrl.host;
    const origin = `${protocol}://${host}`;

    const shareUrl = await generateShareUrl(origin, openapi, config);
    return json({ shareUrl }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate share url';
    return json({ message: 'Internal server error', error: message }, 500);
  }
};
