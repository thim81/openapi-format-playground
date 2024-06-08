import {Base64} from 'js-base64';
import {gzip, ungzip} from 'pako';

export const generateShareUrl = (origin: string, openapi?: string, config?: object): string => {
  const url = new URL(`${origin}`);

  if (openapi && openapi.length > 0) {
    const encodedInput = Base64.fromUint8Array(gzip(openapi));
    url.searchParams.set('input', encodedInput);
  }

  if (config && Object.keys(config).length > 0) {
    const encodedConfig = Base64.fromUint8Array(gzip(JSON.stringify(config)));
    url.searchParams.set('config', encodedConfig);
  }

  return url.toString();
};

interface DecodedShareUrl {
  openapi?: string;
  config?: any;
}

export const decodeShareUrl = async (url: string): Promise<DecodedShareUrl> => {
  const urlObj = new URL(url);
  const encodedInput = urlObj.searchParams.get('input');
  const encodedConfig = urlObj.searchParams.get('config');

  const result: DecodedShareUrl = {};

  if (encodedInput) {
    const oa = ungzip(Base64.toUint8Array(encodedInput), {to: 'string'});
    result.openapi = oa;
  }

  if (encodedConfig) {
    const urlConfig = ungzip(Base64.toUint8Array(encodedConfig), {to: 'string'});
    result.config = JSON.parse(urlConfig);
  }

  return result;
};
