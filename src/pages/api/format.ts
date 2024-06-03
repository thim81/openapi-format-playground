import type {NextApiRequest, NextApiResponse} from 'next';
import {
  detectFormat,
  openapiFilter,
  OpenAPIFilterOptions, OpenAPIFilterSet, OpenAPIResult,
  parseString, stringify
} from 'openapi-format';

import defaultFilterJson from './defaults/defaultFilter.json'
import {OpenAPIV3} from "openapi-types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {openapiString, sort, filterOptions} = req.body;

  try {
    const format = await detectFormat(openapiString)
    let oaObj = await parseString(openapiString) as OpenAPIV3.Document || ''
    let output = {data: oaObj} as OpenAPIResult

    // Sort OpenAPI
    // if (sort) {
    //   formatted = await openapiSort(openapiString, {} as OpenAPISortOptions);
    // }

    // Filter OpenAPI
    if (filterOptions) {
      const filterOpts = await parseString(filterOptions) as OpenAPIFilterSet
      const defaultOpts = defaultFilterJson as OpenAPIFilterSet
      const options = {filterSet: filterOpts, defaultFilter: defaultOpts} as OpenAPIFilterOptions
      output = await openapiFilter(oaObj, options) as OpenAPIResult;
    }

    // Convert format
    output.data = await stringify(output.data, {format: format});

    res.status(200).json(output);
  } catch (error) {
    // @ts-ignore
    res.status(500).json({error: error.message});
  }
}
