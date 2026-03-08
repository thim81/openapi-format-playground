import { describe, expect, it } from 'vitest';
import { generateJsonPathSuggestions, scanPathsFromRaw } from './overlayJsonPathSuggestions';

describe('overlayJsonPathSuggestions', () => {
  it('generates path suggestions from parsed openapi object', () => {
    const oa = {
      openapi: '3.0.3',
      paths: {
        '/pets': {
          get: { operationId: 'listPets' },
        },
      },
    };
    const suggestions = generateJsonPathSuggestions(oa);
    expect(suggestions).toContain("$.paths['/pets']");
    expect(suggestions.some((s) => s.includes('/pets'))).toBe(true);
    expect(suggestions.some((s) => s.includes('/pets') && s.endsWith('.get.operationId'))).toBe(
      true,
    );
    expect(suggestions.some((s) => s.includes("[['/pets']]"))).toBe(false);
  });

  it('scans path suggestions from raw yaml when parsing is unavailable', () => {
    const raw = `openapi: 3.0.3
paths:
  /pets:
    get:
      summary: list pets
`;
    const suggestions = scanPathsFromRaw(raw);
    expect(suggestions).toContain("$.paths['/pets']");
  });
});
