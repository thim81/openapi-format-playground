export const DEFAULT_OVERLAY_VERSION = '1.1.0';

export interface OverlayAction {
  target: string;
  update?: unknown;
  add?: unknown;
  remove?: boolean;
  copy?: string;
  enabled?: boolean;
  description?: string;
  [key: string]: unknown;
}

export interface OverlayInfo {
  title?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
}

export interface OverlayDocument {
  overlay?: string;
  info?: OverlayInfo;
  extends?: string;
  actions?: OverlayAction[];
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Error);

export const getOverlayActionKind = (action: OverlayAction): 'update' | 'remove' | 'copy' => {
  if (action.remove === true) return 'remove';
  if (action.copy !== undefined) return 'copy';
  return 'update';
};

export const migrateLegacyAddAction = (action: OverlayAction): OverlayAction => {
  const next = { ...action } as OverlayAction;
  if (next.add !== undefined && next.update === undefined) {
    next.update = next.add;
  }
  delete next.add;
  return next;
};

export const migrateLegacyCopyAction = (action: OverlayAction): OverlayAction => {
  const next: {
    from?: unknown;
    copy?: string | boolean;
    [key: string]: unknown;
  } = { ...action };
  if (next.copy === true) {
    next.copy = typeof next.from === 'string' && next.from.trim().length > 0 ? next.from : '$';
  }
  delete next.from;
  return next as OverlayAction;
};

export const normalizeOverlayForUi = (value: OverlayDocument): OverlayDocument => {
  const source = isRecord(value) ? (value as OverlayDocument) : {};
  const rawInfo = isRecord(source.info) ? source.info : {};
  const rawActions = Array.isArray(source.actions) ? source.actions : [];
  const actions = rawActions
    .map((action) => (isRecord(action) ? migrateLegacyAddAction(action as OverlayAction) : null))
    .filter((action): action is OverlayAction => action !== null)
    .map((action) => migrateLegacyCopyAction(action))
    .map((action) => ({
      ...action,
      target: typeof action.target === 'string' ? action.target : '',
    }));

  const overlayVersion =
    typeof source.overlay === 'string' && source.overlay.trim().length > 0
      ? source.overlay
      : DEFAULT_OVERLAY_VERSION;

  return {
    ...source,
    overlay: overlayVersion,
    info: {
      title: '',
      version: '',
      description: '',
      ...rawInfo,
    },
    actions,
  };
};

export const normalizeOverlayForProcessing = (value: OverlayDocument): OverlayDocument => {
  const source = isRecord(value) ? (value as OverlayDocument) : {};
  const rawActions = Array.isArray(source.actions) ? source.actions : [];
  const actions = rawActions
    .map((action) => (isRecord(action) ? migrateLegacyAddAction(action as OverlayAction) : null))
    .filter((action): action is OverlayAction => action !== null)
    .map((action) => migrateLegacyCopyAction(action));

  const overlayVersion =
    typeof source.overlay === 'string' && source.overlay.trim().length > 0
      ? source.overlay
      : DEFAULT_OVERLAY_VERSION;

  return {
    ...source,
    overlay: overlayVersion,
    actions,
  };
};
