import React, {useEffect, useRef} from 'react';
import Editor, {OnMount} from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({value, onChange, language, height = '90vh'}) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== value) {
        model.setValue(value);
      }
    }
  }, [value]);

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
    minimap: {enabled: false},
    tabSize: 2,
    automaticLayout: true
  }

  return (
    <Editor
      height={height}
      defaultLanguage="yaml"
      language={language}
      defaultValue={value}
      value={value}
      onChange={(value) => onChange(value || '')}
      onMount={handleEditorDidMount}
      options={editorOptions}
    />
  );
};

export default MonacoEditorComponent;
