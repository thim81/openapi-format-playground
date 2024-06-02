import type {NextApiRequest, NextApiResponse} from 'next';
import {openapiFilter, OpenAPIFilterOptions} from 'openapi-format';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const {openapiString} = req.body;

    try {
        const formatted = await openapiFilter(openapiString, {} as OpenAPIFilterOptions);
        res.status(200).json({formatted});
    } catch (error) {
        // @ts-ignore
        res.status(500).json({error: error.message});
    }
}
