// components/DiffEditorModal.tsx

import React, {useEffect, useState} from 'react';
import {DiffEditor, DiffOnMount} from '@monaco-editor/react';
import SimpleModal from './SimpleModal';

interface DiffEditorModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  original: string;
  modified: string;
  language?: string;
}

const DiffEditorModal: React.FC<DiffEditorModalProps> = ({ isOpen, onRequestClose, original, modified, language }) => {
  const [theme, setTheme] = useState<'vs-light' | 'vs-dark'>('vs-light');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'vs-dark' : 'vs-light');

      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'vs-dark' : 'vs-light');
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);

      // Cleanup listener on unmount
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, []);

  const handleDiffEditorDidMount: DiffOnMount = (editor, monaco) => {
    monaco.editor.setTheme(theme);
  };

  const editorOptions = {
    fontFamily: '"Cascadia Code", "Jetbrains Mono", "Fira Code", "Menlo", "Consolas", monospace',
    fontLigatures: true,
    fontSize: 12,
    lineHeight: 20,
    minimap: { enabled: false },
    tabSize: 2,
    automaticLayout: true,
    scrollBeyondLastLine: false,
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-xl font-bold mb-4">Diff Editor</h2>
      <DiffEditor
        original={original}
        modified={modified}
        language={language || 'yaml'}
        height="86vh"
        options={editorOptions}
        theme={theme}
        onMount={handleDiffEditorDidMount}
      />
    </SimpleModal>
  );
};

export default DiffEditorModal;
