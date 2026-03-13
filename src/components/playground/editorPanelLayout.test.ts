import { describe, expect, it } from 'vitest';

import { shouldUseCompactActions } from './EditorPanel';

describe('shouldUseCompactActions', () => {
  it('keeps labels visible at typical half-panel widths', () => {
    expect(shouldUseCompactActions(700)).toBe(false);
  });

  it('hides labels when the panel gets narrow', () => {
    expect(shouldUseCompactActions(500)).toBe(true);
  });
});
