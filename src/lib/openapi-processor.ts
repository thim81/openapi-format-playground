import {
  OpenAPIFilterSet,
  OpenAPISortSet,
  OpenAPICasingSet,
  OpenAPIGenerateSet,
  openapiFilter,
  openapiSort,
  openapiChangeCase,
  openapiGenerate,
  openapiOverlay,
  openapiConvertVersion,
  parseString,
  stringify,
  detectFormat,
  analyzeOpenApi,
  type AnalyzeOpenApiResult,
  type OpenAPIFilterOptions,
  type OpenAPISortOptions,
  type OpenAPICasingOptions,
  type OpenAPIGenerateOptions,
  type OpenAPIOverlayOptions,
  type OpenAPIResult,
} from 'openapi-format';
import type { OpenAPIV3 } from 'openapi-types';
import defaultSortJson from '@/defaults/defaultSort.json';
import defaultFilterJson from '@/defaults/defaultFilter.json';

export interface ComponentMetrics {
  schemas: string[];
  responses: string[];
  parameters: string[];
  examples: string[];
  requestBodies: string[];
  headers: string[];
  meta: {
    total: number;
  };
}

export interface ProcessResult {
  output: string;
  totalComponents: number;
  totalUnusedComponents: number;
  components: ComponentMetrics;
  unusedComponents: ComponentMetrics;
  totalActions: number;
  totalUsedActions: number;
  totalUnusedActions: number;
  unusedActions: any[];
  usedActions: any[];
}

export const defaultCompMetrics: ComponentMetrics = {
  schemas: [],
  responses: [],
  parameters: [],
  examples: [],
  requestBodies: [],
  headers: [],
  meta: { total: 0 },
};

export interface ProcessConfig {
  sort: boolean;
  keepComments: boolean;
  filterSet: string;
  sortSet: string;
  overlaySet: string;
  generateSet: string;
  casingSet: string;
  toggleGenerate: boolean;
  toggleCasing: boolean;
  toggleOverlay: boolean;
  outputLanguage: 'json' | 'yaml';
  convertVersion: string;
}

export async function processOpenApi(input: string, config: ProcessConfig): Promise<ProcessResult> {
  const {
    sort,
    keepComments,
    filterSet,
    sortSet,
    overlaySet,
    generateSet,
    casingSet,
    toggleGenerate,
    toggleCasing,
    toggleOverlay,
    outputLanguage,
    convertVersion,
  } = config;

  const convertOptions = {
    keepComments: keepComments || false,
    format: undefined as string | undefined,
  };
  let oaObj = (await parseString(input, convertOptions)) as unknown as OpenAPIV3.Document;
  let output = { data: oaObj } as OpenAPIResult;

  // Generate
  if (generateSet?.length > 0 && toggleGenerate) {
    const generateOpts = (await parseString(generateSet)) as OpenAPIGenerateSet;
    const options = { generateSet: generateOpts } as OpenAPIGenerateOptions;
    output = (await openapiGenerate(oaObj, options)) as OpenAPIResult;
    oaObj = (output.data as OpenAPIV3.Document) || oaObj;
  }

  // Filter
  if (filterSet?.length > 0) {
    const filterOpts = (await parseString(filterSet)) as OpenAPIFilterSet;
    const defaultOpts = defaultFilterJson as OpenAPIFilterSet;
    const options = { filterSet: filterOpts, defaultFilter: defaultOpts } as OpenAPIFilterOptions;
    output = (await openapiFilter(oaObj, options)) as OpenAPIResult;
    oaObj = (output.data as OpenAPIV3.Document) || oaObj;
  }

  // Overlay
  if (overlaySet?.length > 0 && toggleOverlay) {
    const overlayParsed = await parseString(overlaySet);
    if (
      overlayParsed instanceof Error ||
      !overlayParsed ||
      typeof overlayParsed !== 'object' ||
      Array.isArray(overlayParsed)
    ) {
      throw new Error('Invalid overlay configuration');
    }
    const overlayOpts = { ...(overlayParsed as any) };
    if (Array.isArray(overlayOpts.actions)) {
      overlayOpts.actions = overlayOpts.actions
        .filter((action: any) => action?.enabled !== false)
        .map((action: any) => {
          const next = { ...action };
          delete next.enabled;
          return next;
        });
    }
    const options = { overlaySet: overlayOpts } as OpenAPIOverlayOptions;
    const { data, resultData } = await openapiOverlay(oaObj, options);
    output.data = data;
    oaObj = (output.data as OpenAPIV3.Document) || oaObj;
    output.resultData = { ...output.resultData, ...resultData };
  }

  // Sort
  if (sort) {
    let sortOpts = {} as OpenAPISortSet;
    if (sortSet) {
      sortOpts = (await parseString(sortSet)) as OpenAPISortSet;
    }
    const defaultOpts = defaultSortJson as OpenAPISortSet;
    const options = {
      sortSet: Object.assign({}, defaultOpts, sortOpts),
      sortComponentsSet: [],
    } as OpenAPISortOptions;
    const sortedRes = (await openapiSort(oaObj, options)) as OpenAPIResult;
    output.data = sortedRes.data;
    oaObj = (output.data as OpenAPIV3.Document) || oaObj;
  }

  // Casing
  if (casingSet?.length > 0 && toggleCasing) {
    const caseOpts = (await parseString(casingSet)) as OpenAPICasingSet;
    const options = { casingSet: caseOpts } as OpenAPICasingOptions;
    const casedRes = await openapiChangeCase(oaObj, options);
    output.data = casedRes.data;
    oaObj = casedRes.data as OpenAPIV3.Document;
  }

  // Convert version
  if (convertVersion) {
    const converted = await openapiConvertVersion(oaObj as unknown as Record<string, unknown>, {
      convertTo: convertVersion as any,
      convertToVersion: convertVersion === '3.1' ? 3.1 : 3.2,
    });
    if (converted?.data) {
      output.data = converted.data;
      oaObj = converted.data as OpenAPIV3.Document;
    }
    if (converted?.resultData) {
      output.resultData = { ...(output.resultData || {}), ...(converted.resultData as any) };
    }
  }

  const _format = outputLanguage || (await detectFormat(input));
  convertOptions.format = _format;
  const formattedData = await stringify(
    output.data as unknown as Record<string, unknown>,
    convertOptions,
  );

  const rd = (output.resultData || {}) as any;

  return {
    output: formattedData as string,
    totalComponents: rd?.totalComp?.meta?.total || 0,
    totalUnusedComponents: rd?.unusedComp?.meta?.total || 0,
    components: rd?.totalComp || defaultCompMetrics,
    unusedComponents: rd?.unusedComp || defaultCompMetrics,
    totalActions: rd?.totalActions || 0,
    totalUsedActions: rd?.totalUsedActions || 0,
    totalUnusedActions: rd?.unusedActions?.length || 0,
    unusedActions: rd?.unusedActions || [],
    usedActions: rd?.usedActions || [],
  };
}

export { analyzeOpenApi, parseString, stringify };
export type { AnalyzeOpenApiResult, OpenAPIFilterSet, OpenAPISortSet };
