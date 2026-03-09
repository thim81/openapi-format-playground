import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Link as LinkIcon,
  Download,
  GitCompareArrows,
  Loader2,
  Code2,
  Eye,
  LayoutList,
} from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import OpenApiUiEditor from './OpenApiUiEditor';

interface EditorPanelProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  language: string;
  actions?: React.ReactNode;
  readOnly?: boolean;
  loading?: boolean;
  showPreviewToggle?: boolean;
}

const ScalarPreview: React.FC<{ content: string }> = ({ content }) => {
  const srcDoc = useMemo(() => {
    const escaped = content.replace(/</g, '\\x3c').replace(/\\/g, '\\\\');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>body { margin: 0; font-family: system-ui, sans-serif; }</style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#app', {
      content: \`${escaped}\`,
      hideDownloadButton: true,
    });
  </script>
</body>
</html>`;
  }, [content]);

  return (
    <iframe
      srcDoc={srcDoc}
      className='w-full h-full border-0'
      sandbox='allow-scripts allow-same-origin'
      title='API Preview'
    />
  );
};

type ViewMode = 'code' | 'preview' | 'ui';

const EditorPanel: React.FC<EditorPanelProps> = ({
  title,
  value,
  onChange,
  language,
  actions,
  readOnly = false,
  loading = false,
  showPreviewToggle = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('code');

  const modeButtons: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'code', icon: <Code2 className='h-3 w-3' />, label: 'Code' },
    { mode: 'ui', icon: <LayoutList className='h-3 w-3' />, label: 'UI' },
    { mode: 'preview', icon: <Eye className='h-3 w-3' />, label: 'Preview' },
  ];

  return (
    <div className='flex-1 flex flex-col min-w-0 h-full'>
      <div className='flex items-center justify-between px-3 py-1.5 border-b bg-card'>
        <div className='flex items-center gap-2'>
          <h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {title}
          </h3>
          {loading && (
            <div className='flex items-center gap-1.5 text-primary'>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              <span className='text-[11px] font-medium'>Processing...</span>
            </div>
          )}
          {showPreviewToggle && (
            <div className='flex items-center border rounded-md ml-2 overflow-hidden'>
              {modeButtons.map((btn, i) => (
                <React.Fragment key={btn.mode}>
                  <button
                    onClick={() => setViewMode(btn.mode)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      viewMode === btn.mode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {btn.icon} {btn.label}
                  </button>
                  {i < modeButtons.length - 1 && <span className='h-3.5 w-px bg-border/70' />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className='flex items-center gap-1'>{actions}</div>
      </div>
      <div className='flex-1 min-h-0'>
        {viewMode === 'code' ? (
          <MonacoEditor value={value} onChange={onChange} language={language} readOnly={readOnly} />
        ) : viewMode === 'ui' ? (
          <OpenApiUiEditor value={value} onChange={onChange} format={language as 'json' | 'yaml'} />
        ) : (
          <div className='h-full bg-background'>
            {value ? (
              <ScalarPreview content={value} />
            ) : (
              <div className='h-full flex items-center justify-center text-muted-foreground text-sm'>
                No output to preview
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;

// Reusable action buttons
export const UploadButton: React.FC<{ onFileLoad: (content: string) => void }> = ({
  onFileLoad,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFileLoad(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <input
        type='file'
        ref={fileRef}
        onChange={handleFile}
        accept='.yaml,.yml,.json'
        className='hidden'
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => fileRef.current?.click()}
          >
            <Upload className='h-3 w-3' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upload file</TooltipContent>
      </Tooltip>
    </>
  );
};

export const ImportUrlButton: React.FC<{ onUrlLoad: (content: string) => void }> = ({
  onUrlLoad,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    const url = urlValue.trim();
    if (!url) {
      setError('Please enter a URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      onUrlLoad(text);
      setIsOpen(false);
      setUrlValue('');
    } catch (err: any) {
      setError(err?.message || 'Could not fetch URL content.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => {
              setError(null);
              setIsOpen(true);
            }}
          >
            <LinkIcon className='h-3 w-3' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import from URL</TooltipContent>
      </Tooltip>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setError(null);
            setIsLoading(false);
          }
        }}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Import OpenAPI From URL</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <Input
              value={urlValue}
              onChange={(e) => {
                setUrlValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder='https://example.com/openapi.yaml'
              className='font-mono text-sm'
            />
            {error && <p className='text-xs text-destructive'>{error}</p>}
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const DownloadButton: React.FC<{ content: string; filename: string; format: string }> = ({
  content,
  filename,
  format,
}) => {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={handleDownload}>
          <Download className='h-3 w-3' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Download</TooltipContent>
    </Tooltip>
  );
};

export const DiffButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant='ghost' size='icon' className='h-6 w-6' onClick={onClick}>
        <GitCompareArrows className='h-3 w-3' />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Show Diff</TooltipContent>
  </Tooltip>
);
