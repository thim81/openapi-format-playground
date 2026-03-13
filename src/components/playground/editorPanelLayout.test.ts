import { describe, expect, it } from 'vitest';

import { shouldUseCompactActions, shouldUseCompactModeTabs } from './EditorPanel';

describe('shouldUseCompactActions', () => {
  it('keeps labels visible at typical half-panel widths', () => {
    expect(shouldUseCompactActions(700)).toBe(false);
  });

  it('hides labels when the panel gets narrow', () => {
    expect(shouldUseCompactActions(500)).toBe(true);
  });
});

describe('shouldUseCompactModeTabs', () => {
  it('keeps mode labels visible when the panel still has room', () => {
    expect(shouldUseCompactModeTabs(600)).toBe(false);
  });

  it('hides mode labels when the panel gets narrow', () => {
    expect(shouldUseCompactModeTabs(480)).toBe(true);
  });
});
