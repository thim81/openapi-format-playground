import type {NextApiRequest, NextApiResponse} from 'next';
import {
  detectFormat, OpenAPICasingOptions, openapiChangeCase,
  openapiFilter,
  OpenAPIFilterOptions,
  OpenAPIFilterSet,
  openapiGenerate, OpenAPIGenerateOptions, OpenAPIGenerateSet,
  OpenAPIResult,
  openapiSort,
  OpenAPISortOptions,
  OpenAPISortSet,
  parseString,
  stringify
} from 'openapi-format';

import defaultFilterJson from '../../defaults/defaultFilter.json'
import defaultSortJson from '../../defaults/defaultSort.json'
import {OpenAPIV3} from "openapi-types";

export default async function format(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({message: 'Method not allowed'});
    return;
  }

  const {openapi, config} = req.body;
  const {sort, keepComments, filterSet, sortSet, generateSet, casingSet, format} = config || {};

  if (!openapi) {
    res.status(422).json({message: 'Missing openapi'});
    return;
  }

  try {
    const _format = format || await detectFormat(openapi)
    let convertOptions = {keepComments: keepComments || false, format: undefined    };
    let oaObj = await parseString(openapi, convertOptions) as OpenAPIV3.Document || ''
    let output = {data: oaObj} as OpenAPIResult

    // Generate elements OpenAPI
    // Generate elements for OpenAPI document
    if (generateSet) {
      const options = {generateSet: generateSet} as OpenAPIGenerateOptions
      output = await openapiGenerate(oaObj, options) as OpenAPIResult;
      oaObj = output.data as OpenAPIV3.Document || {data: oaObj};
    }

    // Filter OpenAPI
    if (filterSet) {
      const filterOpts = await parseString(filterSet) as OpenAPIFilterSet
      const defaultOpts = defaultFilterJson as OpenAPIFilterSet
      const options = {filterSet: filterOpts, defaultFilter: defaultOpts} as OpenAPIFilterOptions
      output = await openapiFilter(oaObj, options) as OpenAPIResult;
      oaObj = output.data as OpenAPIV3.Document || {data: oaObj};
    }

    // Sort OpenAPI
    if (sort) {
      let sortOpts = {}
      if (sortSet) {
        sortOpts = await parseString(sortSet) as OpenAPISortSet
      }
      const defaultOpts = defaultSortJson as OpenAPISortSet;
      const options = {sortSet: Object.assign({}, defaultOpts, sortOpts), sortComponentsSet: []} as OpenAPISortOptions;
      const sortedRes = await openapiSort(oaObj, options) as OpenAPIResult;
      output.data = sortedRes.data;
      oaObj = output.data as OpenAPIV3.Document || {data: oaObj};
    }

    // Change case OpenAPI document
    if (casingSet) {
      const options = {casingSetSet: casingSet} as OpenAPICasingOptions
      const casedRes = await openapiChangeCase(oaObj, options);
      output.data = casedRes.data;
    }

    // Convert output to JSON/YAML format
    convertOptions.format = _format
    output.data = await stringify(output.data, convertOptions);

    res.status(200).json(output);
  } catch (error) {
    // @ts-ignore
    res.status(500).json({error: error.message});
  }
}
