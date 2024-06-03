// openapi-format.d.ts

declare module 'openapi-format' {
  import { OpenAPIV3 } from 'openapi-types'

  interface OpenAPISortSet {
    root?: Array<'openapi' | 'info' | 'servers' | 'paths' | 'components' | 'tags' | 'x-tagGroups' | 'externalDocs'>
    get?: Array<'operationId' | 'summary' | 'description' | 'parameters' | 'requestBody' | 'responses'>
    post?: Array<'operationId' | 'summary' | 'description' | 'parameters' | 'requestBody' | 'responses'>
    put?: Array<'operationId' | 'summary' | 'description' | 'parameters' | 'requestBody' | 'responses'>
    patch?: Array<'operationId' | 'summary' | 'description' | 'parameters' | 'requestBody' | 'responses'>
    delete?: Array<'operationId' | 'summary' | 'description' | 'parameters' | 'requestBody' | 'responses'>
    parameters?: Array<'name' | 'in' | 'description' | 'required' | 'schema'>
    requestBody?: Array<'description' | 'required' | 'content'>
    responses?: Array<'description' | 'headers' | 'content' | 'links'>
    content?: Array<string>
    components?: Array<'parameters' | 'schemas'>
    schema?: Array<'description' | 'type' | 'items' | 'properties' | 'format' | 'example' | 'default'>
    schemas?: Array<'description' | 'type' | 'items' | 'properties' | 'format' | 'example' | 'default'>
    properties?: Array<'description' | 'type' | 'items' | 'format' | 'example' | 'default' | 'enum'>
  }

  interface OpenAPISortOptions {
    sortSet: OpenAPISortSet
  }

  interface OpenAPIFilterSet {
    methods?: string[]
    tags?: string[]
    operationIds?: string[]
    operations?: string[]
    flags?: string[]
    flagValues?: string[]
    inverseMethods?: string[]
    inverseTags?: string[]
    inverseOperationIds?: string[]
    unusedComponents?: string[]
    stripFlags?: string[]
    responseContent?: string[]
    inverseResponseContent?: string[]
  }

  interface OpenAPIFilterOptions {
    filterSet?: OpenAPIFilterSet
    defaultFilter?: OpenAPIFilterSet
  }

  interface OpenAPIResult {
    data: OpenAPIV3.Document
    resultData: Record<string, never>
  }

  /**
   * OpenAPI-format sort function
   * Traverse through the OpenAPI document and sort the props according to the sort configuration.
   * @param {OpenAPIV3.Document} oaObj OpenAPI document
   * @param {OpenAPISortOptions} options OpenAPI-format sort options
   * @returns {Promise<OpenAPIResult>} Sorted OpenAPI document
   */
  export async function  openapiSort(
      oaObj: OpenAPIV3.Document,
      options: OpenAPISortOptions
  ): Promise<OpenAPIResult>


  /**
   * OpenAPI-format filter function
   * Traverse through all keys and based on the key name, filter the props according to the filter configuration.
   * @param {OpenAPIV3.Document} oaObj OpenAPI document
   * @param {OpenAPIFilterOptions} options OpenAPI-format filter options
   * @returns {Promise<OpenAPIResult>} Filtered OpenAPI document
   */
  export async function openapiFilter(
    oaObj: OpenAPIV3.Document,
    options: OpenAPIFilterOptions
  ): Promise<OpenAPIResult>

  /**
   * OpenAPI-format parse function
   * Parse a JSON/YAML document
   * @returns {Promise<Record<string, unknown>} Data object
   */
  export async function parseFile(
    filePath: string,
    options: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>>

  /**
   * OpenAPI-format parse function
   * Parse a JSON/YAML string
   * @returns {Promise<Record<string, unknown>} Data object
   */
  export async function parseString(
    input: string,
    options: Record<string, unknown> = {}
  ): Promise< OpenAPIResult | OpenAPISortOptions | OpenAPIFilterOptions | Record<string, unknown>>

  /**
   * OpenAPI-format parse function
   * Parse a JSON/YAML string
   */
  export async function detectFormat(
    input: string,
  ): Promise<'json' | 'yaml' | 'unknown'>

  /**
   * OpenAPI-format write function for JSON/YAML
   * @param filePath Path to the output file.
   * @param data Data object.
   * @param options Write options
   * @returns {Promise<void>}
   */
  export async function writeFile(
    filePath: string,
    data: Record<string, unknown> | OpenAPIV3.Document,
    options: WriteFileOptions = {}
  ): Promise<void>

  /**
   * OpenAPI-format change case function
   * @param {string} valueAsString - The input string to change case.
   * @param {string} caseType - The type of case to change to (e.g.'camelCase', 'pascalCase', 'kebabCase', 'snakeCase').
   * @returns {string} - The string with the specified case.
   */
  export function changeCase(valueAsString: string, caseType: string): string
}
