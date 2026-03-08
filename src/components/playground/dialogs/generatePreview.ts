import { openapiGenerate, parseString } from 'openapi-format';
import type { OpenAPIGenerateSet, OpenAPIResult } from 'openapi-format';
import type { OpenAPIV3 } from 'openapi-types';

export async function generateOperationIdPreview(
  openapi: string,
  operationIdTemplate: string,
  overwriteExisting: boolean
): Promise<string[]> {
  if (!openapi || !operationIdTemplate) return [];

  const oaObj = (await parseString(openapi)) as unknown as OpenAPIV3.Document;
  const generateSet: OpenAPIGenerateSet = { operationIdTemplate, overwriteExisting };
  const result = (await openapiGenerate(oaObj, { generateSet })) as OpenAPIResult;
  const data = result.data as OpenAPIV3.Document;

  const ids: string[] = [];
  if (!data.paths) return ids;

  Object.values(data.paths).forEach((pathItem) => {
    if (!pathItem) return;
    ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].forEach((method) => {
      const op = (pathItem as any)[method];
      if (op?.operationId) ids.push(op.operationId);
    });
  });

  return ids;
}
