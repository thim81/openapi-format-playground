import {
  detectFormat,
  openapiChangeCase,
  openapiConvertVersion,
  openapiFilter,
  openapiGenerate,
  openapiOverlay,
  openapiSort,
  parseString,
  stringify,
  OpenAPICasingOptions,
  OpenAPICasingSet,
  OpenAPIFilterOptions,
  OpenAPIFilterSet,
  OpenAPIGenerateOptions,
  OpenAPIGenerateSet,
  OpenAPIOverlayOptions,
  OpenAPISortOptions,
  OpenAPISortSet,
  OpenAPIResult
} from "openapi-format";
import { OpenAPIV3 } from "openapi-types";
import defaultFilterJson from "../defaults/defaultFilter.json";
import defaultSortJson from "../defaults/defaultSort.json";

export interface FormatConfig {
  sort?: boolean;
  keepComments?: boolean;
  filterSet?: string | OpenAPIFilterSet;
  sortSet?: string | OpenAPISortSet;
  generateSet?: string | OpenAPIGenerateSet;
  casingSet?: string | OpenAPICasingSet;
  overlaySet?: string | Record<string, unknown>;
  format?: string;
  convertVersion?: "3.1" | "3.2";
  resolveExtendsOnly?: boolean;
}

const parseMaybe = async <T>(value?: string | T): Promise<T | undefined> => {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    return (await parseString(value)) as T;
  }
  return value as T;
};

const hasValue = (value?: string | unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
};

export const formatOpenApi = async (
  openapi: string,
  config?: FormatConfig
): Promise<OpenAPIResult> => {
  const {
    sort,
    keepComments,
    filterSet,
    sortSet,
    generateSet,
    casingSet,
    overlaySet,
    format,
    convertVersion
  } = config || {};

  let input = openapi;

  if (!input && hasValue(overlaySet)) {
    const overlayObj = await parseMaybe<Record<string, unknown>>(overlaySet);
    const extendsRef = overlayObj && typeof overlayObj === "object" ? (overlayObj as any).extends : undefined;
    if (extendsRef && typeof extendsRef === "string" && /^(http|https):\/\//i.test(extendsRef)) {
      const resp = await fetch(extendsRef);
      if (!resp.ok) {
        throw new Error(`Failed to fetch extends: ${resp.status} ${resp.statusText}`);
      }
      input = await resp.text();
    }
  }

  if (!input) {
    throw new Error("Missing openapi");
  }

  const _format = format || (await detectFormat(input));
  const convertOptions: Record<string, unknown> = {
    keepComments: keepComments || false,
    format: undefined
  };

  let oaObj = (await parseString(input, convertOptions)) as OpenAPIV3.Document;
  let output = { data: oaObj } as OpenAPIResult;

  if (hasValue(generateSet)) {
    const generateOpts = await parseMaybe<OpenAPIGenerateSet>(generateSet);
    const options = { generateSet: generateOpts } as OpenAPIGenerateOptions;
    output = (await openapiGenerate(oaObj, options)) as OpenAPIResult;
    oaObj = output.data as OpenAPIV3.Document;
  }

  if (hasValue(filterSet)) {
    const filterOpts = await parseMaybe<OpenAPIFilterSet>(filterSet);
    const defaultOpts = defaultFilterJson as OpenAPIFilterSet;
    const options = {
      filterSet: filterOpts,
      defaultFilter: defaultOpts
    } as OpenAPIFilterOptions;
    output = (await openapiFilter(oaObj, options)) as OpenAPIResult;
    oaObj = output.data as OpenAPIV3.Document;
  }

  if (hasValue(overlaySet)) {
    const overlayOpts = await parseMaybe<Record<string, unknown>>(overlaySet);
    const options = { overlaySet: overlayOpts } as OpenAPIOverlayOptions;
    const { data, resultData } = await openapiOverlay(oaObj, options);
    output.data = data;
    oaObj = output.data as OpenAPIV3.Document;
    output.resultData = { ...(output.resultData || {}), ...(resultData || {}) } as any;
  }

  if (sort) {
    let sortOpts = {} as OpenAPISortSet;
    if (hasValue(sortSet)) {
      sortOpts = (await parseMaybe<OpenAPISortSet>(sortSet)) || {};
    }
    const defaultOpts = defaultSortJson as OpenAPISortSet;
    const options = {
      sortSet: Object.assign({}, defaultOpts, sortOpts),
      sortComponentsSet: []
    } as OpenAPISortOptions;
    const sortedRes = (await openapiSort(oaObj, options)) as OpenAPIResult;
    output.data = sortedRes.data;
    oaObj = output.data as OpenAPIV3.Document;
  }

  if (hasValue(casingSet)) {
    const caseOpts = await parseMaybe<OpenAPICasingSet>(casingSet);
    const options = { casingSet: caseOpts } as OpenAPICasingOptions;
    const casedRes = await openapiChangeCase(oaObj, options);
    output.data = casedRes.data;
    oaObj = casedRes.data as OpenAPIV3.Document;
  }

  if (convertVersion) {
    const mergeResultData = (resultData?: Record<string, unknown>) => {
      if (resultData && Object.keys(resultData).length > 0) {
        output.resultData = { ...(output.resultData || {}), ...resultData } as any;
      }
    };

    const converted = await openapiConvertVersion(oaObj, {
      convertTo: convertVersion,
      convertToVersion: convertVersion === "3.1" ? 3.1 : 3.2
    });

    if (converted?.data) {
      output.data = converted.data;
      oaObj = converted.data as OpenAPIV3.Document;
    }

    mergeResultData(converted?.resultData as Record<string, unknown> | undefined);
  }

  convertOptions.format = _format;
  output.data = await stringify(output.data, convertOptions);
  return output;
};
