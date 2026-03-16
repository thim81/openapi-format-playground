import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OVERLAY_VERSION,
  getOverlayActionKind,
  normalizeOverlayForProcessing,
  normalizeOverlayForUi,
} from './overlay-normalize';

describe('overlay-normalize', () => {
  it('defaults missing overlay version to 1.1.0', () => {
    const result = normalizeOverlayForUi({ actions: [] });
    expect(result.overlay).toBe(DEFAULT_OVERLAY_VERSION);
  });

  it('migrates legacy add action to update', () => {
    const result = normalizeOverlayForProcessing({
      actions: [{ target: '$.info.title', add: 'My API' }],
    });
    expect(result.actions?.[0]).toMatchObject({
      target: '$.info.title',
      update: 'My API',
    });
    expect(result.actions?.[0]).not.toHaveProperty('add');
  });

  it('preserves copy/from action and detects kind as copy', () => {
    const result = normalizeOverlayForUi({
      actions: [{ target: '$.info.title', copy: true, from: '$.info.version' }],
    });
    const action = result.actions?.[0];
    expect(action).toMatchObject({
      target: '$.info.title',
      copy: true,
      from: '$.info.version',
    });
    expect(getOverlayActionKind(action!)).toBe('copy');
  });
});
