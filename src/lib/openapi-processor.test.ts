import { describe, expect, it } from 'vitest';

import { processOpenApi } from './openapi-processor';

const inputOpenApi = `openapi: 3.1.0
info:
  title: Sample API
  version: 1.0.0
paths: {}
`;

const baseConfig = {
  sort: false,
  keepComments: false,
  filterSet: '',
  sortSet: '',
  generateSet: '',
  casingSet: '',
  toggleGenerate: false,
  toggleCasing: false,
  outputLanguage: 'yaml' as const,
  convertVersion: '',
};

describe('processOpenApi overlay 1.1', () => {
  it('migrates legacy add action into update before overlay processing', async () => {
    const overlaySet = `actions:
  - target: $.info.title
    add: Migrated title
`;

    const result = await processOpenApi(inputOpenApi, {
      ...baseConfig,
      overlaySet,
      toggleOverlay: true,
    });

    expect(result.output).toContain('title: Migrated title');
  });

  it('supports copy action and primitive update action', async () => {
    const overlaySet = `overlay: 1.1.0
actions:
  - target: $.info.title
    copy: $.info.version
  - target: $.info.version
    update: 2.0.0
`;

    const result = await processOpenApi(inputOpenApi, {
      ...baseConfig,
      overlaySet,
      toggleOverlay: true,
    });

    expect(result.output).toContain('title: 1.0.0');
    expect(result.output).toContain('version: 2.0.0');
  });
});

describe('processOpenApi casing keep chars', () => {
  it('preserves configured keep characters when changing casing', async () => {
    const input = `openapi: 3.1.0
info:
  title: Sample API
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: get_foo-bar
      responses:
        '200':
          description: OK
`;

    const result = await processOpenApi(input, {
      ...baseConfig,
      sort: false,
      casingSet: `operationId: camelCase
operationIdKeepChars:
  - '_'
  - '-'
`,
      toggleCasing: true,
    });

    expect(result.output).toContain('operationId: get_foo-bar');
  });
});
