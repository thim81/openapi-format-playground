// components/DiffEditorModal.tsx

import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import SimpleModal from './SimpleModal';

interface DiffEditorModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  original: string;
  modified: string;
  language?: string;
}

const DiffEditorModal: React.FC<DiffEditorModalProps> = ({ isOpen, onRequestClose, original, modified, language }) => {

  const editorOptions = {
    fontFamily: '"Cascadia Code", "Jetbrains Mono", "Fira Code", "Menlo", "Consolas", monospace',
    fontLigatures: true,
    fontSize: 12,
    lineHeight: 20,
    minimap: {enabled: false},
    tabSize: 2,
    automaticLayout: true,
    scrollBeyondLastLine: false
  }

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-xl font-bold mb-4">Diff Editor</h2>
      <DiffEditor
        original={original}
        modified={modified}
        language={language || 'yaml'}
        height="86vh"
        options={editorOptions}
      />
    </SimpleModal>
  );
};

export default DiffEditorModal;
