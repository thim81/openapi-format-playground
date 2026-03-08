import { Base64 } from 'js-base64';
import { gzip, ungzip } from 'pako';
import { parseString, stringify } from 'openapi-format';

export interface PlaygroundConfig {
  sort?: boolean;
  keepComments?: boolean;
  filterSet?: string;
  sortSet?: string;
  overlaySet?: string;
  generateSet?: string;
  casingSet?: string;
  toggleGenerate?: boolean;
  toggleCasing?: boolean;
  toggleOverlay?: boolean;
  toggleFilter?: boolean;
  isFilterOptionsCollapsed?: boolean;
  outputLanguage?: 'json' | 'yaml';
  convertVersion?: string;
  pathSort?: 'original' | 'path' | 'tags';
  defaultFieldSorting?: boolean;
}

export interface DecodedShareUrl {
  openapi?: string;
  config?: PlaygroundConfig;
}

export const generateShareUrl = async (
  origin: string,
  openapi?: string,
  config?: PlaygroundConfig
): Promise<string> => {
  const url = new URL(origin);

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

export const decodeShareUrl = async (url: string): Promise<DecodedShareUrl> => {
  const urlObj = new URL(url);
  const encodedInput = urlObj.searchParams.get('input');
  const encodedConfig = urlObj.searchParams.get('config');

  const result: DecodedShareUrl = {};

  if (encodedInput) {
    result.openapi = ungzip(Base64.toUint8Array(encodedInput), { to: 'string' });
  }
  if (encodedConfig) {
    const urlConfig = ungzip(Base64.toUint8Array(encodedConfig), { to: 'string' });
    result.config = (await parseString(urlConfig)) as PlaygroundConfig;
  }
  return result;
};

export const includeUnusedComponents = (obj: any, include: boolean) => {
  const components = ["schemas", "parameters", "examples", "headers", "requestBodies", "responses"];
  if (include) {
    if (!obj.unusedComponents) {
      obj.unusedComponents = components;
    }
  } else {
    delete obj.unusedComponents;
  }
  return obj;
};

export const includePreserve = (obj: any, include: boolean) => {
  if (include) {
    obj.preserveEmptyObjects = true;
  } else {
    delete obj.preserveEmptyObjects;
  }
  return obj;
};
