import { gzipSync } from "node:zlib";
import { parseString, stringify } from "openapi-format";

export interface ShareConfig {
  sort?: boolean;
  keepComments?: boolean;
  filterSet?: string | object;
  sortSet?: string | object;
  overlaySet?: string | object;
  generateSet?: string | object;
  casingSet?: string | object;
  format?: string;
  convertVersion?: "3.1" | "3.2";
  isFilterOptionsCollapsed?: boolean;
  outputLanguage?: "json" | "yaml";
  pathSort?: "original" | "path" | "tags";
  defaultFieldSorting?: boolean;
}

const encodeGzipBase64 = (value: string): string => {
  const gz = gzipSync(Buffer.from(value, "utf-8"));
  return Buffer.from(gz).toString("base64");
};

export const generateShareUrl = async (
  origin: string,
  openapi?: string,
  config?: ShareConfig
): Promise<string> => {
  const url = new URL(origin);

  if (openapi && openapi.length > 0) {
    url.searchParams.set("input", encodeGzipBase64(openapi));
  }

  if (config && Object.keys(config).length > 0) {
    const configOps: ShareConfig = {};

    if (config.sortSet !== undefined) configOps.sortSet = await stringify(config.sortSet as any);
    if (config.filterSet !== undefined) configOps.filterSet = await stringify(config.filterSet as any);
    if (config.generateSet !== undefined) configOps.generateSet = await stringify(config.generateSet as any);
    if (config.casingSet !== undefined) configOps.casingSet = await stringify(config.casingSet as any);
    if (config.overlaySet !== undefined) configOps.overlaySet = config.overlaySet as any;
    if (config.sort !== undefined) configOps.sort = config.sort;
    if (config.isFilterOptionsCollapsed !== undefined)
      configOps.isFilterOptionsCollapsed = config.isFilterOptionsCollapsed;
    if (config.outputLanguage !== undefined)
      configOps.outputLanguage = config.outputLanguage;
    if (config.convertVersion !== undefined)
      configOps.convertVersion = config.convertVersion;
    if (config.pathSort !== undefined) configOps.pathSort = config.pathSort;
    if (config.defaultFieldSorting !== undefined)
      configOps.defaultFieldSorting = config.defaultFieldSorting;

    const encodedConfig = encodeGzipBase64(JSON.stringify(configOps));
    url.searchParams.set("config", encodedConfig);
  }

  return url.toString();
};

export const parseConfigInput = async (config?: string | object): Promise<ShareConfig | undefined> => {
  if (!config) return undefined;
  if (typeof config === "string") {
    return (await parseString(config)) as ShareConfig;
  }
  return config as ShareConfig;
};
