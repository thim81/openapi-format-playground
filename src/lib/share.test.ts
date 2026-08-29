import { describe, expect, it } from 'vitest';
import { Base64 } from 'js-base64';
import { gzip } from 'pako';

import { decodeShareUrl, generateShareUrl } from './share';

describe('share helpers', () => {
  it('round-trips openapi and config through the share URL', async () => {
    const openapi = 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: "1"\n';
    const config = {
      sort: true,
      outputLanguage: 'yaml' as const,
      pathSort: 'tags' as const,
      toggleOverlay: false,
    };

    const url = await generateShareUrl('https://playground.openapi-format.com', openapi, config);
    const decoded = await decodeShareUrl(url);

    expect(decoded).toEqual({
      openapi,
      config,
    });
  });

  it('omits config from the URL when it is empty', async () => {
    const url = await generateShareUrl(
      'https://playground.openapi-format.com',
      'openapi: 3.0.0',
      {},
    );
    expect(new URL(url).searchParams.has('config')).toBe(false);
  });

  it('decodes legacy yaml-encoded config payloads', async () => {
    const legacyConfig = ['sort: true', 'outputLanguage: yaml', 'pathSort: tags'].join('\n');
    const encodedConfig = Base64.fromUint8Array(gzip(legacyConfig));
    const url = new URL('https://playground.openapi-format.com');
    url.searchParams.set('config', encodedConfig);

    const decoded = await decodeShareUrl(url.toString());

    expect(decoded.config).toEqual({
      sort: true,
      outputLanguage: 'yaml',
      pathSort: 'tags',
    });
  });
});
