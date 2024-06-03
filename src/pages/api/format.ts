import type {NextApiRequest, NextApiResponse} from 'next';
import {
  detectFormat,
  openapiFilter,
  OpenAPIFilterOptions, OpenAPIFilterSet, OpenAPIResult,
  openapiSort,
  OpenAPISortOptions, parseFile,
  parseString
} from 'openapi-format';

import defaultFilterJson from './defaults/defaultFilter.json'
import {OpenAPIV3} from "openapi-types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {openapiString, sort, filterOptions} = req.body;

  try {
    let formatted
    let oaObj = await parseString(openapiString) as OpenAPIV3.Document

    // Sort OpenAPI
    // if (sort) {
    //   formatted = await openapiSort(openapiString, {} as OpenAPISortOptions);
    // }

    // Filter OpenAPI
    if (filterOptions) {
      const filterOpts = await parseString(filterOptions) as OpenAPIFilterSet
      const defaultOpts = defaultFilterJson as OpenAPIFilterSet
      const options = {filterSet: filterOpts, defaultFilter: defaultOpts} as OpenAPIFilterOptions
      formatted = await openapiFilter(oaObj, options) as OpenAPIResult;
    }

    res.status(200).json({formatted});
  } catch (error) {
    // @ts-ignore
    res.status(500).json({error: error.message});
  }
}
