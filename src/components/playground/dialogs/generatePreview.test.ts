import { describe, expect, it } from 'vitest';
import { generateOperationIdPreview } from './generatePreview';

const openapiWithOperationIds = `openapi: 3.0.3
info:
  title: Test
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
    post:
      summary: Create pet
`;

describe('generateOperationIdPreview', () => {
  it('keeps existing operationIds when overwriteExisting is false', async () => {
    const ids = await generateOperationIdPreview(
      openapiWithOperationIds,
      '<method>_<pathPart1>',
      false,
    );
    expect(ids).toContain('listPets');
  });

  it('applies template to existing operationIds when overwriteExisting is true', async () => {
    const ids = await generateOperationIdPreview(
      openapiWithOperationIds,
      '<method>_<pathPart1>',
      true,
    );
    expect(ids).toContain('get_pets');
    expect(ids).toContain('post_pets');
  });
});
