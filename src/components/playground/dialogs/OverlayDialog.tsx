import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload,
  Link,
  Download,
  Code2,
  LayoutList,
  Crosshair,
  Layers,
} from 'lucide-react';
import MonacoEditor from '../MonacoEditor';
import { parseString, stringify, resolveJsonPathValue } from 'openapi-format';
import { toast } from '@/hooks/use-toast';
import JsonPathPickerDialog from './JsonPathPickerDialog';
import { generateJsonPathSuggestions, scanPathsFromRaw } from './overlayJsonPathSuggestions';
import { importTextFromUrl } from '@/lib/importUrlClient';
import {
  DEFAULT_OVERLAY_VERSION,
  getOverlayActionKind,
  normalizeOverlayForUi,
  type OverlayAction,
  type OverlayDocument,
} from '@/lib/overlay-normalize';

interface OverlayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  overlaySet: string;
  openapi: string;
  onSubmit: (overlay: OverlayDocument) => void;
  format: 'json' | 'yaml';
}

const actionTypes = [
  { label: 'Update', value: 'update' },
  { label: 'Copy', value: 'copy' },
  { label: 'Remove', value: 'remove' },
];

const isOverlayDocument = (value: unknown): value is OverlayDocument => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value instanceof Error) return false;
  return true;
};

const getEnabledActions = (actions: OverlayAction[]): Set<number> =>
  new Set(actions.map((action, i) => (action.enabled === false ? -1 : i)).filter((i) => i >= 0));

const pruneUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val !== undefined) out[key] = pruneUndefined(val);
    });
    return out;
  }
  return value;
};

const resolveJsonPath = (
  obj: any,
  path: string,
): { value: any; matches: number; invalid: boolean } => {
  try {
    if (!obj || !path) return { value: undefined, matches: 0, invalid: false };
    const values = resolveJsonPathValue(obj as Record<string, unknown>, path) as unknown[];
    return { value: values?.[0], matches: values?.length || 0, invalid: false };
  } catch {
    return { value: undefined, matches: 0, invalid: true };
  }
};

const OverlayDialog: React.FC<OverlayDialogProps> = ({
  isOpen,
  onClose,
  overlaySet,
  openapi,
  onSubmit,
  format,
}) => {
  const [mode, setMode] = useState<'ui' | 'code'>('ui');
  const [overlay, setOverlay] = useState<OverlayDocument>({
    overlay: DEFAULT_OVERLAY_VERSION,
    info: { title: '', version: '', description: '' },
    actions: [],
  });
  const [codeValue, setCodeValue] = useState('');
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [enabledActions, setEnabledActions] = useState<Set<number>>(new Set());
  const [parsedOpenApi, setParsedOpenApi] = useState<any>(null);
  const [targetPreviews, setTargetPreviews] = useState<Map<number, string>>(new Map());
  const [actionUpdateValues, setActionUpdateValues] = useState<Map<number, string>>(new Map());
  const [jsonPathSuggestions, setJsonPathSuggestions] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [importUrlValue, setImportUrlValue] = useState('');
  const [importUrlError, setImportUrlError] = useState<string | null>(null);
  const [importUrlLoading, setImportUrlLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveBaseOpenApi = async (overlayDoc?: OverlayDocument): Promise<string> => {
    if (openapi && openapi.trim().length > 0) return openapi;
    const ext = (overlayDoc?.extends || overlay.extends || '').trim();
    if (/^https?:\/\//i.test(ext)) {
      try {
        return await importTextFromUrl(ext);
      } catch {
        // Ignore fetch errors; preview remains empty without a base OpenAPI document.
      }
    }
    return '';
  };

  const setPreviewSource = async (overlayDoc?: OverlayDocument) => {
    const baseOpenApi = await resolveBaseOpenApi(overlayDoc);
    if (!baseOpenApi) {
      setParsedOpenApi(null);
      setJsonPathSuggestions([]);
      return;
    }
    try {
      const parsed = await parseString(baseOpenApi);
      if (parsed instanceof Error) throw parsed;
      setParsedOpenApi(parsed);
      let suggestions = generateJsonPathSuggestions(parsed);
      const hasPathSuggestions = suggestions.some((s) => s.startsWith('$.paths['));
      if (!hasPathSuggestions) {
        const scanned = scanPathsFromRaw(baseOpenApi);
        if (scanned.length > 0) suggestions = Array.from(new Set([...suggestions, ...scanned]));
      }
      setJsonPathSuggestions(suggestions);
    } catch {
      setParsedOpenApi(null);
      setJsonPathSuggestions(scanPathsFromRaw(baseOpenApi));
    }
  };

  useEffect(() => {
    void setPreviewSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openapi, overlay.extends]);

  useEffect(() => {
    const parse = async () => {
      if (overlaySet) {
        try {
          const rawParsed = await parseString(overlaySet);
          if (!isOverlayDocument(rawParsed)) throw new Error('Invalid overlay document');
          const parsed = normalizeOverlayForUi(rawParsed);
          setOverlay(parsed);
          setCodeValue(overlaySet);
          const actions = parsed.actions || [];
          setExpandedActions(new Set(actions.map((_, i) => i)));
          setEnabledActions(getEnabledActions(actions));
          const vals = new Map<number, string>();
          for (let i = 0; i < actions.length; i++) {
            const actionValue = actions[i].update;
            if (actionValue !== undefined) {
              if (typeof actionValue === 'object') {
                vals.set(i, (await stringify(actionValue as any, { format })) as string);
              } else {
                vals.set(i, String(actionValue));
              }
            }
          }
          setActionUpdateValues(vals);
          await setPreviewSource(parsed);
        } catch {
          setCodeValue(overlaySet);
        }
      } else {
        setOverlay(
          normalizeOverlayForUi({
            overlay: DEFAULT_OVERLAY_VERSION,
            info: { title: '', version: '', description: '' },
            actions: [],
          }),
        );
        setCodeValue('');
        setExpandedActions(new Set());
        setEnabledActions(new Set());
        setActionUpdateValues(new Map());
        await setPreviewSource();
      }
    };
    if (isOpen) parse();
  }, [overlaySet, isOpen, format]);

  useEffect(() => {
    let cancelled = false;
    const buildTargetPreviews = async () => {
      if (!parsedOpenApi) {
        if (!cancelled) setTargetPreviews(new Map());
        return;
      }
      const next = new Map<number, string>();
      const actions = overlay.actions || [];
      for (let i = 0; i < actions.length; i++) {
        const target = actions[i]?.target || '';
        if (!target) {
          next.set(i, '');
          continue;
        }
        const { value } = resolveJsonPath(parsedOpenApi, target);
        if (value === undefined) {
          next.set(i, '');
          continue;
        }
        try {
          const rendered =
            typeof value === 'object'
              ? ((await stringify(value as any, { format })) as string)
              : String(value);
          next.set(i, rendered.slice(0, 500));
        } catch {
          try {
            next.set(i, JSON.stringify(value, null, 2).slice(0, 500));
          } catch {
            next.set(i, String(value).slice(0, 500));
          }
        }
      }
      if (!cancelled) setTargetPreviews(next);
    };
    void buildTargetPreviews();
    return () => {
      cancelled = true;
    };
  }, [parsedOpenApi, overlay.actions, format]);

  const syncCodeFromUi = async () => {
    try {
      const doc = pruneUndefined(buildFinalOverlay()) as OverlayDocument;
      const code = await stringify(doc as any, { format });
      setCodeValue(code as string);
    } catch {}
  };

  const syncUiFromCode = async (): Promise<boolean> => {
    try {
      if (!codeValue.trim()) {
        const parsed = normalizeOverlayForUi({});
        setOverlay(parsed);
        setExpandedActions(new Set());
        setEnabledActions(new Set());
        setActionUpdateValues(new Map());
        await setPreviewSource(parsed);
        return true;
      }

      const rawParsed = await parseString(codeValue);
      if (!isOverlayDocument(rawParsed)) throw new Error('Invalid overlay document');
      const parsed = normalizeOverlayForUi(rawParsed);
      setOverlay(parsed);
      const actions = parsed.actions || [];
      setExpandedActions(new Set(actions.map((_, i) => i)));
      setEnabledActions(getEnabledActions(actions));
      const vals = new Map<number, string>();
      for (let i = 0; i < actions.length; i++) {
        const actionValue = actions[i].update;
        if (actionValue !== undefined) {
          if (typeof actionValue === 'object') {
            vals.set(i, (await stringify(actionValue as any, { format })) as string);
          } else {
            vals.set(i, String(actionValue));
          }
        }
      }
      setActionUpdateValues(vals);
      await setPreviewSource(parsed);
      return true;
    } catch {
      toast({
        title: 'Invalid overlay code',
        description: 'Please fix the overlay YAML/JSON before switching to UI mode.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const addAction = () => {
    const newActions = [
      ...(overlay.actions || []),
      { target: '$.paths', update: {}, enabled: true },
    ];
    const newIndex = newActions.length - 1;
    setOverlay({ ...overlay, actions: newActions });
    setExpandedActions((prev) => new Set([...prev, newIndex]));
    setEnabledActions((prev) => new Set([...prev, newIndex]));
    setActionUpdateValues((prev) => new Map(prev).set(newIndex, ''));
  };

  const removeAction = (index: number) => {
    const actions = [...(overlay.actions || [])];
    actions.splice(index, 1);
    setOverlay({ ...overlay, actions });
    const reindex = (set: Set<number>) => {
      const next = new Set<number>();
      set.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    };
    setExpandedActions(reindex);
    setEnabledActions(reindex);
    const newVals = new Map<number, string>();
    actionUpdateValues.forEach((v, i) => {
      if (i < index) newVals.set(i, v);
      else if (i > index) newVals.set(i - 1, v);
    });
    setActionUpdateValues(newVals);
  };

  const duplicateAction = (index: number) => {
    const actions = [...(overlay.actions || [])];
    const cloned = JSON.parse(JSON.stringify(actions[index]));
    actions.splice(index + 1, 0, cloned);
    setOverlay({ ...overlay, actions });
    const newIndex = index + 1;
    setExpandedActions((prev) => new Set([...prev, newIndex]));
    setEnabledActions((prev) => {
      const s = new Set(prev);
      if (prev.has(index)) s.add(newIndex);
      return s;
    });
    setActionUpdateValues((prev) => new Map(prev).set(newIndex, prev.get(index) || ''));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const actions = [...(overlay.actions || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    [actions[index], actions[newIndex]] = [actions[newIndex], actions[index]];
    setOverlay({ ...overlay, actions });
    const swapInSet = (set: Set<number>) => {
      const next = new Set(set);
      const hadOld = next.has(index);
      const hadNew = next.has(newIndex);
      if (hadOld) next.add(newIndex);
      else next.delete(newIndex);
      if (hadNew) next.add(index);
      else next.delete(index);
      return next;
    };
    setExpandedActions(swapInSet);
    setEnabledActions(swapInSet);
    setActionUpdateValues((prev) => {
      const next = new Map(prev);
      const a = prev.get(index);
      const b = prev.get(newIndex);
      if (a !== undefined) next.set(newIndex, a);
      else next.delete(newIndex);
      if (b !== undefined) next.set(index, b);
      else next.delete(index);
      return next;
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const actions = [...(overlay.actions || [])];
    actions[index] = { ...actions[index], [field]: value };
    setOverlay({ ...overlay, actions });
  };

  const handleActionTypeChange = (index: number, type: string) => {
    const actions = [...(overlay.actions || [])];
    const next = { ...actions[index] } as any;
    delete next.remove;
    delete next.copy;
    delete next.from;
    delete next.add;

    if (type === 'remove') {
      delete next.update;
      actions[index] = { ...next, remove: true };
      setActionUpdateValues((prev) => {
        const map = new Map(prev);
        map.delete(index);
        return map;
      });
    } else if (type === 'copy') {
      delete next.update;
      actions[index] = { ...next, copy: true, from: '$' };
      setActionUpdateValues((prev) => {
        const map = new Map(prev);
        map.delete(index);
        return map;
      });
    } else {
      actions[index] = { ...next, update: {} };
      setActionUpdateValues((prev) => new Map(prev).set(index, ''));
    }
    setOverlay({ ...overlay, actions });
  };

  const handleUpdateValueChange = async (index: number, val: string) => {
    setActionUpdateValues((prev) => new Map(prev).set(index, val));
    try {
      const parsed = await parseString(val);
      if (parsed instanceof Error) throw parsed;
      updateAction(index, 'update', parsed);
    } catch {
      updateAction(index, 'update', val);
    }
  };

  const buildFinalOverlay = (): OverlayDocument => {
    const actionsWithEnabled = (overlay.actions || []).map((action, i) => ({
      ...action,
      enabled: enabledActions.has(i),
    }));
    return pruneUndefined({ ...overlay, actions: actionsWithEnabled }) as OverlayDocument;
  };

  const handleSubmit = async () => {
    if (mode === 'code') {
      try {
        const rawParsed = await parseString(codeValue);
        if (!isOverlayDocument(rawParsed)) throw new Error('Invalid overlay document');
        onSubmit(pruneUndefined(normalizeOverlayForUi(rawParsed)) as OverlayDocument);
      } catch {
        toast({
          title: 'Invalid overlay code',
          description: 'Fix YAML/JSON errors before applying.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      onSubmit(buildFinalOverlay());
    }
    onClose();
  };

  const handleDownload = async () => {
    const doc =
      mode === 'code'
        ? codeValue
        : ((await stringify(pruneUndefined(buildFinalOverlay()) as any, { format })) as string);
    const blob = new Blob([doc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overlay.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportUrl = async () => {
    const url = importUrlValue.trim();
    if (!url) {
      setImportUrlError('Please enter a URL.');
      return;
    }
    setImportUrlLoading(true);
    setImportUrlError(null);
    try {
      const text = await importTextFromUrl(url);
      if (mode === 'code') {
        setCodeValue(text);
      } else {
        const rawParsed = await parseString(text);
        if (!isOverlayDocument(rawParsed)) throw new Error('Invalid overlay document');
        const parsed = normalizeOverlayForUi(rawParsed);
        setOverlay(parsed);
        const actions = parsed.actions || [];
        setExpandedActions(new Set(actions.map((_, i) => i)));
        setEnabledActions(getEnabledActions(actions));
      }
      setIsImportUrlOpen(false);
      setImportUrlValue('');
      toast({ title: 'Overlay imported successfully' });
    } catch (err: any) {
      setImportUrlError(err?.message || 'Could not fetch or parse URL content.');
      toast({ title: 'Failed to import overlay', variant: 'destructive' });
    } finally {
      setImportUrlLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (mode === 'code') {
        setCodeValue(text);
      } else {
        try {
          const rawParsed = await parseString(text);
          if (!isOverlayDocument(rawParsed)) throw new Error('Invalid overlay document');
          const parsed = normalizeOverlayForUi(rawParsed);
          setOverlay(parsed);
          const actions = parsed.actions || [];
          setExpandedActions(new Set(actions.map((_, i) => i)));
          setEnabledActions(getEnabledActions(actions));
        } catch {}
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getMatchCount = (target: string): number => {
    if (!parsedOpenApi) return 0;
    return resolveJsonPath(parsedOpenApi, target).matches;
  };

  const getJsonPathValidationMessage = (target: string): string | null => {
    if (!target) return null;
    if (!target.startsWith('$')) return 'JSONPath must start with "$".';
    const { invalid } = resolveJsonPath(parsedOpenApi, target);
    return invalid ? 'Invalid JSONPath expression.' : null;
  };

  const actionsCount = overlay.actions?.length || 0;
  const enabledCount = enabledActions.size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[96vw] max-w-[96vw] h-[96vh] max-h-[96vh] flex flex-col gap-0 p-0 overflow-hidden'>
        {/* Header */}
        <div className='px-6 pt-5 pb-4 border-b bg-gradient-to-b from-muted/50 to-transparent'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2.5'>
              <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
                <Layers className='h-4 w-4 text-primary' />
              </div>
              Manage Overlay Actions
              <Badge
                variant='outline'
                className='ml-1 h-5 rounded-md px-2 py-0 text-[10px] font-mono'
              >
                overlay {overlay.overlay || DEFAULT_OVERLAY_VERSION}
              </Badge>
              {actionsCount > 0 && (
                <Badge variant='secondary' className='ml-1 text-[10px] font-mono'>
                  {enabledCount}/{actionsCount} active
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className='flex items-center justify-between mt-4'>
            <div className='flex items-center gap-1.5'>
              {mode === 'ui' && (
                <Button size='sm' className='h-8 text-xs gap-1.5 shadow-sm' onClick={addAction}>
                  <Plus className='h-3.5 w-3.5' /> Add Action
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={() => {
                  setImportUrlError(null);
                  setIsImportUrlOpen(true);
                }}
              >
                <Link className='h-3.5 w-3.5' /> Import URL
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className='h-3.5 w-3.5' /> Upload File
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='.yaml,.yml,.json'
                className='hidden'
                onChange={handleFileUpload}
              />
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={handleDownload}
              >
                <Download className='h-3.5 w-3.5' /> Download
              </Button>
              <Separator orientation='vertical' className='h-5' />
              <Button
                variant={mode === 'code' ? 'default' : 'outline'}
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={async () => {
                  if (mode === 'ui') {
                    await syncCodeFromUi();
                    setMode('code');
                    return;
                  }
                  const ok = await syncUiFromCode();
                  if (ok) setMode('ui');
                }}
              >
                {mode === 'ui' ? (
                  <Code2 className='h-3.5 w-3.5' />
                ) : (
                  <LayoutList className='h-3.5 w-3.5' />
                )}
                {mode === 'ui' ? 'Code Mode' : 'UI Mode'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 min-h-0 overflow-hidden'>
          {mode === 'ui' ? (
            <div className='h-full overflow-y-auto'>
              <div className='p-6 space-y-4'>
                {/* Info + Extends row */}
                <div className='grid grid-cols-[1fr_120px_1fr] gap-3'>
                  <div className='space-y-1.5 min-w-0'>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      Title
                    </Label>
                    <Input
                      value={overlay.info?.title || ''}
                      onChange={(e) =>
                        setOverlay({ ...overlay, info: { ...overlay.info, title: e.target.value } })
                      }
                      placeholder='My Overlay'
                      className='h-9'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      Version
                    </Label>
                    <Input
                      value={overlay.info?.version || ''}
                      onChange={(e) =>
                        setOverlay({
                          ...overlay,
                          info: { ...overlay.info, version: e.target.value },
                        })
                      }
                      placeholder='1.0.0'
                      className='h-9'
                    />
                  </div>
                  <div className='space-y-1.5 min-w-0'>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      Extends
                    </Label>
                    <Input
                      value={overlay.extends || ''}
                      onChange={(e) => setOverlay({ ...overlay, extends: e.target.value })}
                      placeholder='https://example.com/openapi.yaml'
                      className='h-9'
                    />
                  </div>
                </div>
                <div className='space-y-1.5 min-w-0'>
                  <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Description
                  </Label>
                  <Textarea
                    value={overlay.info?.description || ''}
                    onChange={(e) =>
                      setOverlay({
                        ...overlay,
                        info: { ...overlay.info, description: e.target.value },
                      })
                    }
                    placeholder='Overlay to add docs metadata and copy values'
                    className='min-h-[72px] text-sm'
                  />
                </div>
                {actionsCount === 0 && (
                  <div className='border-2 border-dashed rounded-xl py-12 flex flex-col items-center gap-3 text-muted-foreground'>
                    <div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center'>
                      <Layers className='h-6 w-6' />
                    </div>
                    <p className='text-sm font-medium'>No overlay actions yet</p>
                    <p className='text-xs'>
                      Add an action to start modifying your OpenAPI document
                    </p>
                    <Button size='sm' className='mt-1 gap-1.5' onClick={addAction}>
                      <Plus className='h-3.5 w-3.5' /> Add First Action
                    </Button>
                  </div>
                )}

                {/* Actions */}
                {(overlay.actions || []).map((action, i) => {
                  const isExpanded = expandedActions.has(i);
                  const isEnabled = enabledActions.has(i);
                  const matchCount = getMatchCount(action.target);
                  const targetPathValidation = getJsonPathValidationMessage(action.target);
                  const preview = targetPreviews.get(i) || '';
                  const actionKind = getOverlayActionKind(action);
                  const isRemove = actionKind === 'remove';
                  const isCopy = actionKind === 'copy';
                  const isUpdate = actionKind === 'update';

                  return (
                    <div
                      key={i}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        !isEnabled ? 'opacity-50' : ''
                      } ${isExpanded ? 'shadow-sm' : ''}`}
                    >
                      {/* Action Header */}
                      <div
                        className='flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors'
                        onClick={() => {
                          setExpandedActions((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          });
                        }}
                      >
                        <div className='flex items-center gap-3'>
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <ChevronRight className='h-4 w-4 text-muted-foreground' />
                          )}
                          <div className='flex items-center gap-2'>
                            <span className='text-sm font-semibold'>Action {i + 1}</span>
                            {action.target && (
                              <code className='text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded'>
                                {action.target}
                              </code>
                            )}
                            {matchCount > 0 && (
                              <Badge
                                variant='default'
                                className='text-[10px] px-1.5 py-0 h-[18px] font-mono bg-primary/15 text-primary border-0'
                              >
                                {matchCount} match
                              </Badge>
                            )}
                            <Badge
                              variant='outline'
                              className='text-[10px] px-1.5 py-0 h-[18px] font-mono'
                            >
                              {actionKind}
                            </Badge>
                          </div>
                        </div>
                        <div
                          className='flex items-center gap-1'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className='flex items-center gap-1.5 text-xs cursor-pointer mr-2'>
                            <Checkbox
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                const nextEnabled = !!checked;
                                setEnabledActions((prev) => {
                                  const next = new Set(prev);
                                  if (nextEnabled) next.add(i);
                                  else next.delete(i);
                                  return next;
                                });
                                updateAction(i, 'enabled', nextEnabled);
                              }}
                            />
                            <span className='text-muted-foreground text-[11px]'>Enabled</span>
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                                onClick={() => moveAction(i, 'up')}
                                disabled={i === 0}
                              >
                                <ArrowUp className='h-3.5 w-3.5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                                onClick={() => moveAction(i, 'down')}
                                disabled={i === actionsCount - 1}
                              >
                                <ArrowDown className='h-3.5 w-3.5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move down</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7'
                                onClick={() => duplicateAction(i)}
                              >
                                <Copy className='h-3.5 w-3.5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-destructive hover:text-destructive'
                                onClick={() => removeAction(i)}
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Expanded Content — Two Panel */}
                      {isExpanded && (
                        <div className='border-t bg-card'>
                          <div className='grid grid-cols-2 divide-x min-h-[260px]'>
                            {/* Left Panel — Input */}
                            <div className='p-4 space-y-4'>
                              <div className='space-y-2'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                    Target (JSONPath)
                                  </Label>
                                  {matchCount > 0 ? (
                                    <span className='text-[11px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full'>
                                      {matchCount} match
                                    </span>
                                  ) : targetPathValidation ? (
                                    <span className='text-[11px] text-destructive font-medium'>
                                      invalid JSONPath
                                    </span>
                                  ) : (
                                    <span className='text-[11px] text-destructive font-medium'>
                                      no match
                                    </span>
                                  )}
                                </div>
                                <Input
                                  value={action.target}
                                  onChange={(e) => updateAction(i, 'target', e.target.value)}
                                  list={`jsonpath-suggestions-${i}`}
                                  className='h-9 font-mono text-sm border-2 focus-visible:border-primary'
                                  placeholder='$.info.title'
                                />
                                <datalist id={`jsonpath-suggestions-${i}`}>
                                  {jsonPathSuggestions.slice(0, 500).map((s) => (
                                    <option key={s} value={s} />
                                  ))}
                                </datalist>
                                {targetPathValidation && (
                                  <p className='text-[11px] text-destructive'>
                                    {targetPathValidation}
                                  </p>
                                )}
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='h-7 text-[11px] gap-1.5'
                                  onClick={() => {
                                    setPickerIndex(i);
                                    setIsPickerOpen(true);
                                  }}
                                >
                                  <Crosshair className='h-3 w-3' /> Pick target
                                </Button>
                              </div>

                              <div className='space-y-2'>
                                <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                  Action Type
                                </Label>
                                <Select
                                  value={actionKind}
                                  onValueChange={(v) => handleActionTypeChange(i, v)}
                                >
                                  <SelectTrigger className='h-9 w-full border-2'>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {actionTypes.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {isCopy && (
                                <div className='space-y-2'>
                                  <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                    From (JSONPath)
                                  </Label>
                                  <Input
                                    value={action.from || ''}
                                    onChange={(e) => updateAction(i, 'from', e.target.value)}
                                    list={`jsonpath-suggestions-from-${i}`}
                                    className='h-9 font-mono text-sm border-2 focus-visible:border-primary'
                                    placeholder='$.components.schemas.Pet'
                                  />
                                  <datalist id={`jsonpath-suggestions-from-${i}`}>
                                    {jsonPathSuggestions.slice(0, 500).map((s) => (
                                      <option key={s} value={s} />
                                    ))}
                                  </datalist>
                                </div>
                              )}

                              {isUpdate && (
                                <div className='space-y-2 flex-1'>
                                  <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                    Update Value
                                  </Label>
                                  <div className='h-[140px] border-2 rounded-lg overflow-hidden'>
                                    <MonacoEditor
                                      value={actionUpdateValues.get(i) || ''}
                                      onChange={(val) => handleUpdateValueChange(i, val)}
                                      language={format}
                                      height='140px'
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Panel — Preview */}
                            <div className='p-4 bg-muted/40 flex flex-col'>
                              <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2'>
                                Target Preview
                              </Label>
                              <div className='flex-1 border-2 rounded-lg bg-background p-3 overflow-auto font-mono min-h-[200px]'>
                                {preview ? (
                                  <pre className='text-xs text-foreground whitespace-pre-wrap break-all leading-relaxed'>
                                    {preview}
                                  </pre>
                                ) : (
                                  <div className='h-full flex items-center justify-center'>
                                    <p className='text-xs text-muted-foreground italic'>
                                      No match — adjust the JSONPath target
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {actionsCount > 0 && (
                  <div className='flex justify-end pt-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs gap-1.5'
                      onClick={addAction}
                    >
                      <Plus className='h-3.5 w-3.5' /> Add Action
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='h-full p-4'>
              <div className='h-full border rounded-lg overflow-hidden'>
                <MonacoEditor value={codeValue} onChange={setCodeValue} language={format} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t bg-muted/20 flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className='gap-1.5 shadow-sm'>
            Apply Overlay
          </Button>
        </div>
      </DialogContent>
      <JsonPathPickerDialog
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        suggestions={jsonPathSuggestions}
        onPick={(value) => {
          if (pickerIndex == null) return;
          updateAction(pickerIndex, 'target', value);
        }}
      />
      <Dialog
        open={isImportUrlOpen}
        onOpenChange={(open) => {
          setIsImportUrlOpen(open);
          if (!open) {
            setImportUrlError(null);
            setImportUrlLoading(false);
          }
        }}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Import Overlay From URL</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <Input
              value={importUrlValue}
              onChange={(e) => {
                setImportUrlValue(e.target.value);
                if (importUrlError) setImportUrlError(null);
              }}
              placeholder='https://example.com/oaf.overlay.yaml'
              className='font-mono text-sm'
            />
            {importUrlError && <p className='text-xs text-destructive'>{importUrlError}</p>}
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsImportUrlOpen(false)}
                disabled={importUrlLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleImportUrl} disabled={importUrlLoading}>
                {importUrlLoading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default OverlayDialog;
