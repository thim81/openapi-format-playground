import type {NextApiRequest, NextApiResponse} from 'next';
import {
  detectFormat,
  openapiFilter,
  OpenAPIFilterOptions, OpenAPIFilterSet, OpenAPIResult, openapiSort, OpenAPISortOptions, OpenAPISortSet,
  parseString, stringify
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
  const {sort, filterSet, sortSet, format} = config || {};

  if (!openapi) {
    res.status(422).json({message: 'Missing openapi'});
    return;
  }

  try {
    const _format = format || await detectFormat(openapi)
    let oaObj = await parseString(openapi) as OpenAPIV3.Document || ''
    let output = {data: oaObj} as OpenAPIResult

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
    }

    // Convert output to JSON/YAML format
    output.data = await stringify(output.data, {format: _format});

    res.status(200).json(output);
  } catch (error) {
    // @ts-ignore
    res.status(500).json({error: error.message});
  }
}
