import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { resolveMonacoTheme } from '../monacoTheme';

interface DiffEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  original: string;
  modified: string;
  language: string;
}

const DiffEditorDialog: React.FC<DiffEditorDialogProps> = ({
  isOpen, onClose, original, modified, language,
}) => {
  const { theme } = useTheme();
  const openInstanceRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      openInstanceRef.current += 1;
    }
  }, [isOpen]);

  const originalModelPath = useMemo(
    () => `inmemory://oaf/diff/${openInstanceRef.current}/original.${language}`,
    [language, isOpen]
  );
  const modifiedModelPath = useMemo(
    () => `inmemory://oaf/diff/${openInstanceRef.current}/modified.${language}`,
    [language, isOpen]
  );
  const diffKey = useMemo(
    () => `${openInstanceRef.current}:${language}:${original.length}:${modified.length}`,
    [language, original, modified, isOpen]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-[96vw] h-[96vh] max-h-[96vh]">
        <DialogHeader>
          <DialogTitle>Diff View</DialogTitle>
        </DialogHeader>
        <div className="h-[84vh] border rounded-md overflow-hidden">
          {isOpen && (
            <DiffEditor
              key={diffKey}
              original={original}
              modified={modified}
              language={language}
              theme={resolveMonacoTheme(theme)}
              originalModelPath={originalModelPath}
              modifiedModelPath={modifiedModelPath}
              keepCurrentOriginalModel
              keepCurrentModifiedModel
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                renderSideBySide: true,
                automaticLayout: true,
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiffEditorDialog;
