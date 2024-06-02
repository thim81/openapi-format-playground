import type {NextApiRequest, NextApiResponse} from 'next';
import {
  detectFormat,
  openapiFilter,
  OpenAPIFilterOptions,
  openapiSort,
  OpenAPISortOptions,
  parseString
} from 'openapi-format';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {openapiString, sort, filterOptions} = req.body;

  try {
    let formatted =await  parseString(openapiString)

    // Sort OpenAPI
    if (sort) {
      formatted = await openapiSort(openapiString, {} as OpenAPISortOptions);
    }

    // Filter OpenAPI
    if (filterOptions) {
      const filterOpt = await parseString(filterOptions) as OpenAPIFilterOptions;
      formatted = await openapiFilter(openapiString, filterOpt as OpenAPIFilterOptions);
    }

    res.status(200).json({formatted});
  } catch (error) {
    // @ts-ignore
    res.status(500).json({error: error.message});
  }
}
