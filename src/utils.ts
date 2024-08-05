import {Base64} from 'js-base64';
import {gzip, ungzip} from 'pako';
import {PlaygroundConfig} from "@/components/Playground";
import {OpenAPIFilterSet, parseString, stringify} from "openapi-format";

export interface DecodedShareUrl {
  openapi?: string;
  config?: PlaygroundConfig;
}

export const generateShareUrl = async (origin: string, openapi?: string, config?: PlaygroundConfig): Promise<string> => {
  const url = new URL(`${origin}`);

  if (openapi && openapi.length > 0) {
    const encodedInput = Base64.fromUint8Array(gzip(openapi));
    url.searchParams.set('input', encodedInput);
  }

  if (config && Object.keys(config).length > 0) {
    const configOps = {} as PlaygroundConfig;

    if (config.sortSet !== undefined) configOps.sortSet = await stringify(config.sortSet);
    if (config.filterSet !== undefined) configOps.filterSet = await stringify(config.filterSet);
    // if (options.casingSet !== undefined) config.casingSet = await stringify(options.casingSet);
    if (config.sort !== undefined) configOps.sort = config.sort;
    // if (options.rename !== undefined) config.rename = options.rename;
    // if (options.convertTo !== undefined) config.convertTo = options.convertTo

    if (config.isFilterOptionsCollapsed !== undefined) configOps.isFilterOptionsCollapsed = config.isFilterOptionsCollapsed;
    if (config.isSortOptionsCollapsed !== undefined) configOps.isSortOptionsCollapsed = config.isSortOptionsCollapsed;
    if (config.outputLanguage !== undefined) configOps.outputLanguage = config.outputLanguage;

    if (config.pathSort !== undefined) configOps.pathSort = config.pathSort;
    if (config.defaultFieldSorting !== undefined) configOps.defaultFieldSorting = config.defaultFieldSorting;

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
    result.openapi = ungzip(Base64.toUint8Array(encodedInput), {to: 'string'});
  }
  if (encodedConfig) {
    const urlConfig = ungzip(Base64.toUint8Array(encodedConfig), {to: 'string'})
    result.config = await parseString(urlConfig) as PlaygroundConfig
  }
  return result;
};

export const includeUnusedComponents = (obj: OpenAPIFilterSet, include: boolean) => {
  const components = [
    "schemas",
    "parameters",
    "examples",
    "headers",
    "requestBodies",
    "responses"
  ];
  if (include) {
    if (!obj.hasOwnProperty('unusedComponents')) {
      obj.unusedComponents = components;
    }
  } else {
    if (obj.hasOwnProperty('unusedComponents')) {
      delete obj.unusedComponents;
    }
  }

  return obj;
}
