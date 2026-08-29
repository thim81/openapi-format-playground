import { describe, expect, it } from 'vitest';

import { formatKeepCharsInput, parseKeepCharsInput } from './casingKeepChars';

describe('casingKeepChars helpers', () => {
  it('parses a compact character sequence into unique keep chars', () => {
    expect(parseKeepCharsInput('$_-')).toEqual(['$', '_', '-']);
  });

  it('parses comma and whitespace separated values into unique keep chars', () => {
    expect(parseKeepCharsInput('_, -, ., _, -')).toEqual(['_', '-', '.']);
  });

  it('formats keep chars back into a readable input string', () => {
    expect(formatKeepCharsInput(['_', '-', '.'])).toBe('_, -, .');
  });
});
