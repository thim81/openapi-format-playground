import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JsonPathPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onPick: (value: string) => void;
}

const JsonPathPickerDialog: React.FC<JsonPathPickerDialogProps> = ({
  isOpen,
  onClose,
  suggestions,
  onPick,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 1000);
  }, [suggestions, query]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[80vh] flex flex-col gap-3'>
        <DialogHeader>
          <DialogTitle>Pick a JSONPath target</DialogTitle>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search JSONPath suggestions...'
          className='h-9 font-mono text-sm'
        />

        <ScrollArea className='border rounded-md h-[50vh]'>
          <div className='p-2 space-y-1'>
            {filtered.map((s) => (
              <button
                key={s}
                type='button'
                onClick={() => {
                  onPick(s);
                  onClose();
                }}
                className='w-full text-left px-2 py-1.5 rounded text-sm font-mono hover:bg-muted'
              >
                {s}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className='flex justify-end'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JsonPathPickerDialog;
