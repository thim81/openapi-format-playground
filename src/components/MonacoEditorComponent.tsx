import React, {useEffect, useRef, useState} from 'react';
import Editor, {OnMount} from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({value, onChange, language, height = '85vh'}) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const [theme, setTheme] = useState<'vs-light' | 'vs-dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light'
  );

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.setTheme(theme);
  };

  useEffect(() => {
    // Listen for changes in system theme
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'vs-dark' : 'vs-light');
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      monacoEditor.editor.setTheme(theme);
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== value) {
        model.setValue(value);
      }
    }
  }, [value, theme]);

  const updateEditorValue = (newValue: string) => {
    if (editorRef.current) {
      editorRef.current.setValue(newValue);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value != null && editorRef.current) {
      editorRef.current.setValue(value);
    }
  }

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
    <Editor
      height={height}
      defaultLanguage="yaml"
      language={language}
      defaultValue={value}
      value={value}
      onChange={onChange ? (value) => onChange(value || '') : undefined}
      onMount={handleEditorDidMount}
      options={editorOptions}
    />
  );
};

export default MonacoEditorComponent;
