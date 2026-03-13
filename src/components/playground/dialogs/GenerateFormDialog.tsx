import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wand2, Eye } from 'lucide-react';
import { parseString } from 'openapi-format';
import type { OpenAPIGenerateSet } from 'openapi-format';
import { generateOperationIdPreview } from './generatePreview';

const placeholderOptions = [
  '<operationId>',
  '<method>',
  '<path>',
  '<pathRef>',
  '<tag>',
  '<tag1>',
  '<tag2>',
  '<tagn>',
  '<pathPart1>',
  '<pathPart2>',
  '<pathPartn>',
];

interface GenerateFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: { operationIdTemplate: string; overwriteExisting: boolean }) => void;
  openapi: string;
  generateOptions: string;
}

const GenerateFormDialog: React.FC<GenerateFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  openapi,
  generateOptions,
}) => {
  const [operationIdTemplate, setOperationIdTemplate] = useState('<method>_<pathPart1>');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    const parse = async () => {
      try {
        if (generateOptions) {
          const parsed = (await parseString(generateOptions)) as OpenAPIGenerateSet;
          setOperationIdTemplate(parsed.operationIdTemplate ?? '<method>_<pathPart1>');
          setOverwriteExisting(parsed.overwriteExisting ?? false);
        }
      } catch {}
    };
    parse();
  }, [generateOptions]);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        const ids = await generateOperationIdPreview(
          openapi,
          operationIdTemplate,
          overwriteExisting,
        );
        setPreview(ids);
      } catch {
        setPreview([]);
      }
    };
    generatePreview();
  }, [openapi, operationIdTemplate, overwriteExisting]);

  const insertPlaceholder = (placeholder: string) => {
    setOperationIdTemplate((prev) => prev + placeholder);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl flex flex-col gap-0 p-0 overflow-hidden'>
        {/* Header */}
        <div className='px-6 pt-5 pb-4 border-b bg-gradient-to-b from-muted/50 to-transparent'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2.5'>
              <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
                <Wand2 className='h-4 w-4 text-primary' />
              </div>
              Generate OperationId Configuration
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className='px-6 py-5 space-y-5'>
          {/* Template input */}
          <div className='space-y-2'>
            <Label className='text-xs font-bold uppercase tracking-wider'>
              OperationId Template
            </Label>
            <Input
              value={operationIdTemplate}
              onChange={(e) => setOperationIdTemplate(e.target.value)}
              className='h-11 font-mono text-sm border-2 focus-visible:border-primary'
              placeholder='Enter template...'
            />
          </div>

          {/* Placeholders */}
          <div className='space-y-2'>
            <Label className='text-xs font-bold uppercase tracking-wider'>Placeholders</Label>
            <div className='flex flex-wrap gap-1.5'>
              {placeholderOptions.map((p) => (
                <button
                  key={p}
                  className='px-3 py-1.5 rounded-md bg-muted hover:bg-accent border text-xs font-mono font-medium transition-colors cursor-pointer hover:border-primary/50'
                  onClick={() => insertPlaceholder(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <Label
              htmlFor='overwrite-existing'
              className='text-xs font-bold uppercase tracking-wider'
            >
              Overwrite Existing OperationIds
            </Label>
            <input
              id='overwrite-existing'
              type='checkbox'
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className='h-4 w-4 rounded border-border'
            />
          </div>

          {/* Preview */}
          <div className='space-y-2'>
            <Label className='text-xs font-bold uppercase tracking-wider flex items-center gap-2'>
              <Eye className='h-3.5 w-3.5 text-muted-foreground' />
              Preview
              {preview.length > 0 && (
                <Badge variant='secondary' className='text-[10px] font-mono'>
                  {preview.length} operations
                </Badge>
              )}
            </Label>
            <div className='border-2 rounded-lg overflow-hidden max-h-[240px] overflow-y-auto'>
              {preview.length > 0 ? (
                <div className='divide-y'>
                  {preview.map((id, i) => (
                    <div
                      key={i}
                      className='px-4 py-2.5 text-sm font-mono bg-muted/30 hover:bg-muted/60 transition-colors'
                    >
                      {id}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
                  Enter a template to see generated operation IDs
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t bg-muted/20 flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            className='gap-1.5 shadow-sm'
            onClick={() => {
              onSubmit({ operationIdTemplate, overwriteExisting });
              onClose();
            }}
          >
            <Wand2 className='h-3.5 w-3.5' />
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateFormDialog;
