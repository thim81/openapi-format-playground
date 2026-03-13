import {
  IMPORT_URL_MAX_BYTES,
  IMPORT_URL_TIMEOUT_MS,
  jsonError,
  readResponseTextWithLimit,
  validateImportUrl,
} from '../../src/lib/importUrlShared';

const withTimeout = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

export const onRequestGet = async (context: { request: Request }): Promise<Response> => {
  const requestUrl = new URL(context.request.url);
  const rawUrl = requestUrl.searchParams.get('url') ?? '';
  const validation = validateImportUrl(rawUrl);
  if (!validation.ok) return jsonError(validation.payload, 400);

  const timeout = withTimeout(IMPORT_URL_TIMEOUT_MS);

  try {
    const upstream = await fetch(validation.url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: timeout.signal,
      headers: {
        accept: 'application/json, application/yaml, text/yaml, text/plain, */*',
      },
    });

    if (!upstream.ok) {
      return jsonError(
        {
          error: 'upstream_error',
          message: `Upstream request failed with HTTP ${upstream.status}.`,
        },
        502,
      );
    }

    const text = await readResponseTextWithLimit(upstream, IMPORT_URL_MAX_BYTES);
    return new Response(text, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonError(
        { error: 'timeout', message: 'Remote URL import timed out.' },
        504,
      );
    }

    if (error instanceof Error && error.message === 'oversized_response') {
      return jsonError(
        {
          error: 'oversized_response',
          message: 'Remote URL content exceeds the maximum allowed size.',
        },
        413,
      );
    }

    return jsonError(
      {
        error: 'fetch_failed',
        message: 'Could not fetch the remote URL from the server.',
      },
      502,
    );
  } finally {
    timeout.clear();
  }
};
