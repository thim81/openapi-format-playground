declare module 'openapi-format' {
  export function parseString(input: string, options?: any): Promise<any>;
  export function stringify(input: any, options?: any): Promise<string>;
  export function openapiFilter(input: any, options?: any): Promise<any>;
  export function openapiSort(input: any, options?: any): Promise<any>;
  export function openapiChangeCase(input: any, options?: any): Promise<any>;
  export function openapiGenerate(input: any, options?: any): Promise<any>;
  export function openapiOverlay(input: any, overlay: any, options?: any): Promise<any>;
  export function openapiConvertVersion(input: any, options?: any): Promise<any>;
  export function detectFormat(input: string): string;
  export function analyzeOpenApi(input: any, options?: any): AnalyzeOpenApiResult;

  export interface OpenAPIFilterSet {
    [key: string]: any;
  }
  export interface OpenAPISortSet {
    [key: string]: any;
  }
  export interface OpenAPICasingSet {
    [key: string]: any;
  }
  export interface OpenAPIGenerateSet {
    [key: string]: any;
  }
  export interface AnalyzeOpenApiResult {
    [key: string]: any;
  }
  export interface OpenAPIResult {
    [key: string]: any;
  }
  export interface OpenAPIFilterOptions {
    [key: string]: any;
  }
  export interface OpenAPISortOptions {
    [key: string]: any;
  }
  export interface OpenAPICasingOptions {
    [key: string]: any;
  }
  export interface OpenAPIGenerateOptions {
    [key: string]: any;
  }
  export interface OpenAPIOverlayOptions {
    [key: string]: any;
  }
}

declare module 'js-base64' {
  export const Base64: {
    encode(input: string): string;
    decode(input: string): string;
    fromUint8Array(input: Uint8Array): string;
    toUint8Array(input: string): Uint8Array;
  };
}

declare module 'pako' {
  export function deflate(input: Uint8Array | string, options?: any): Uint8Array;
  export function inflate(input: Uint8Array, options?: any): Uint8Array;
  export function gzip(input: Uint8Array | string, options?: any): Uint8Array;
  export function ungzip(input: Uint8Array, options?: { to: 'string' }): string;
  export function ungzip(input: Uint8Array, options?: any): Uint8Array;
}
