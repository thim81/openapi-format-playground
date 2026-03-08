import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, X, Plus, Code, LayoutList, Upload, Link as LinkIcon } from 'lucide-react';
import MonacoEditor from '../MonacoEditor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { parseSortConfig, serializeSortConfig, type SortConfig } from './sortConfigFormat';

interface SortOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sortSet: string;
  onSubmit: (sortSet: string) => void;
  outputLanguage: 'json' | 'yaml';
  defaultSort: string;
}

/* ── Drag-and-drop field list ─────────────────────────────── */

interface FieldListProps {
  fields: string[];
  onChange: (fields: string[]) => void;
  allKnownFields: string[];
}

const FieldList: React.FC<FieldListProps> = ({ fields, onChange, allKnownFields }) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const unusedFields = useMemo(
    () => allKnownFields.filter((f) => !fields.includes(f)),
    [allKnownFields, fields],
  );

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...fields];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const removeField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };

  const addField = (field: string) => {
    onChange([...fields, field]);
    setAddOpen(false);
  };

  return (
    <div className="space-y-1">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2 px-1">
          No fields — items will keep their original order.
        </p>
      )}
      {fields.map((field, idx) => (
        <div
          key={field}
          draggable
          onDragStart={handleDragStart(idx)}
          onDragOver={handleDragOver(idx)}
          onDrop={handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`
            group flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm
            cursor-grab active:cursor-grabbing transition-colors
            ${dragIdx === idx ? 'opacity-40' : ''}
            ${overIdx === idx && dragIdx !== idx ? 'border-primary bg-accent/50' : 'border-border bg-card hover:bg-accent/30'}
          `}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-mono text-xs">{field}</span>
          <button
            onClick={() => removeField(idx)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {unusedFields.length > 0 && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1">
              <Plus className="h-3 w-3" />
              Add field
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <ScrollArea className="max-h-40">
              {unusedFields.map((f) => (
                <button
                  key={f}
                  onClick={() => addField(f)}
                  className="w-full text-left text-xs font-mono px-2 py-1.5 rounded hover:bg-accent transition-colors"
                >
                  {f}
                </button>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

/* ── Known fields per category (superset for suggestions) ── */

const KNOWN_FIELDS: Record<string, string[]> = {
  root: ['openapi', 'info', 'jsonSchemaDialect', 'servers', 'paths', 'webhooks', 'components', 'security', 'tags', 'x-tagGroups', 'externalDocs'],
  get: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  query: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  post: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  put: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  patch: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  delete: ['operationId', 'summary', 'description', 'tags', 'security', 'parameters', 'requestBody', 'responses', 'callbacks', 'deprecated'],
  parameters: ['name', 'in', 'description', 'required', 'deprecated', 'allowEmptyValue', 'schema', 'example', 'examples'],
  requestBody: ['description', 'required', 'content'],
  responses: ['description', 'headers', 'content', 'links'],
  content: ['schema', 'example', 'examples', 'encoding'],
  components: ['schemas', 'parameters', 'responses', 'requestBodies', 'headers', 'securitySchemes', 'links', 'callbacks', 'mediaTypes'],
  schema: ['description', 'type', 'items', 'properties', 'required', 'format', 'example', 'default', 'enum', 'allOf', 'oneOf', 'anyOf'],
  schemas: ['description', 'type', 'items', 'properties', 'required', 'format', 'example', 'default', 'enum', 'allOf', 'oneOf', 'anyOf'],
  properties: ['description', 'type', 'items', 'format', 'example', 'default', 'enum', 'allOf', 'oneOf', 'anyOf'],
};

/* ── Main dialog ──────────────────────────────────────────── */

const SortOptionsDialog: React.FC<SortOptionsDialogProps> = ({
  isOpen, onClose, sortSet, onSubmit, outputLanguage, defaultSort,
}) => {
  // If sortSet is empty, pre-populate with defaultSort so users can tweak it
  const initialValue = sortSet.trim() || defaultSort;

  const [config, setConfig] = useState<SortConfig>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('root');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [rawValue, setRawValue] = useState(initialValue);
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [importUrlValue, setImportUrlValue] = useState('https://github.com/thim81/openapi-format/blob/main/defaultSort.json');
  const [importUrlError, setImportUrlError] = useState<string | null>(null);
  const [importUrlLoading, setImportUrlLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hydrate = async () => {
      const val = sortSet.trim() || defaultSort;
      const parsed = await parseSortConfig(val);
      setConfig(parsed);
      setRawValue(val);
      const keys = Object.keys(parsed);
      setSelectedCategory((prev) => (keys.length > 0 && !keys.includes(prev) ? keys[0] : prev));
    };
    void hydrate();
  }, [sortSet, defaultSort]);

  const categories = useMemo(() => Object.keys(config), [config]);

  const updateFields = useCallback(
    async (fields: string[]) => {
      const next = { ...config, [selectedCategory]: fields };
      setConfig(next);
      const serialized = await serializeSortConfig(next, outputLanguage);
      setRawValue(serialized);
    },
    [config, selectedCategory, outputLanguage],
  );

  const loadContent = async (content: string) => {
    try {
      const parsed = await parseSortConfig(content);
      if (Object.keys(parsed).length === 0) throw new Error('Empty or invalid');
      setConfig(parsed);
      setRawValue(await serializeSortConfig(parsed, outputLanguage));
      const keys = Object.keys(parsed);
      if (keys.length > 0) setSelectedCategory(keys[0]);
      toast({ title: 'Loaded', description: 'Sort configuration loaded successfully.' });
    } catch {
      toast({ title: 'Invalid file', description: 'Could not parse as a valid sort configuration.', variant: 'destructive' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void loadContent(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadFromUrl = async () => {
    const url = importUrlValue.trim();
    if (!url) return;
    setImportUrlLoading(true);
    setImportUrlError(null);
    try {
      // Convert GitHub blob URLs to raw
      const rawUrl = url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
      const resp = await fetch(rawUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      await loadContent(text);
      setIsImportUrlOpen(false);
    } catch (err: any) {
      setImportUrlError(err?.message || 'Could not fetch the URL.');
      toast({ title: 'Failed to load', description: err?.message || 'Could not fetch the URL.', variant: 'destructive' });
    } finally {
      setImportUrlLoading(false);
    }
  };

  const handleReset = async () => {
    const parsed = await parseSortConfig(defaultSort);
    setConfig(parsed);
    setRawValue(await serializeSortConfig(parsed, outputLanguage));
  };

  const handleApply = async () => {
    if (isAdvanced) {
      onSubmit(rawValue);
    } else {
      onSubmit(await serializeSortConfig(config, outputLanguage));
    }
    onClose();
  };

  const toggleMode = async () => {
    if (!isAdvanced) {
      setRawValue(await serializeSortConfig(config, outputLanguage));
    } else {
      const parsed = await parseSortConfig(rawValue);
      if (Object.keys(parsed).length === 0 && rawValue.trim().length > 0) {
        toast({ title: 'Invalid content', description: 'Could not parse sort configuration.', variant: 'destructive' });
        return;
      }
      setConfig(parsed);
      const keys = Object.keys(parsed);
      if (keys.length > 0) setSelectedCategory(keys[0]);
    }
    setIsAdvanced((v) => !v);
  };

  const knownForCategory = KNOWN_FIELDS[selectedCategory] ?? [];
  const currentFields = config[selectedCategory] ?? [];
  const allSuggestions = [...new Set([...knownForCategory, ...currentFields])];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between gap-2">
          <DialogTitle>Custom Field Sorting</DialogTitle>
          <div className="flex items-center gap-1">
            <input type="file" ref={fileRef} onChange={handleFileUpload} accept=".json,.yaml,.yml" className="hidden" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload sort file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setImportUrlError(null);
                    setIsImportUrlOpen(true);
                  }}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Load from URL</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              {isAdvanced ? <LayoutList className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
              {isAdvanced ? 'Visual editor' : 'Advanced JSON'}
            </Button>
          </div>
        </DialogHeader>

        {isAdvanced ? (
          <div className="h-[50vh] border rounded-md overflow-hidden">
            <MonacoEditor value={rawValue} onChange={setRawValue} language={outputLanguage} />
          </div>
        ) : (
          <div className="flex gap-3 h-[50vh] min-h-0">
            {/* Category list */}
            <div className="w-40 shrink-0 flex flex-col">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                Categories
              </span>
              <ScrollArea className="flex-1">
                <div className="space-y-0.5 pr-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`
                        w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors font-mono
                        ${selectedCategory === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-foreground'
                        }
                      `}
                    >
                      {cat}
                      <Badge
                        variant="secondary"
                        className={`ml-1.5 text-[10px] px-1 py-0 ${
                          selectedCategory === cat ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                        }`}
                      >
                        {(config[cat] ?? []).length}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator orientation="vertical" />

            {/* Field ordering */}
            <div className="flex-1 flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                Field order — <span className="font-mono normal-case">{selectedCategory}</span>
              </span>
              <ScrollArea className="flex-1">
                <div className="pr-2">
                  <FieldList
                    fields={currentFields}
                    onChange={updateFields}
                    allKnownFields={allSuggestions}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Sort Config From URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              value={importUrlValue}
              onChange={(e) => {
                setImportUrlValue(e.target.value);
                if (importUrlError) setImportUrlError(null);
              }}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm font-mono"
              placeholder="https://example.com/oaf-sort.yaml"
            />
            {importUrlError && <p className="text-xs text-destructive">{importUrlError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportUrlOpen(false)} disabled={importUrlLoading}>Cancel</Button>
              <Button onClick={handleLoadFromUrl} disabled={importUrlLoading}>
                {importUrlLoading ? 'Loading...' : 'Load'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SortOptionsDialog;
