import React, {useEffect, useRef} from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  const updateEditorValue = (newValue: string) => {
    if (editorRef.current) {
      editorRef.current.setValue(newValue);
    }
  };

  return (
    <Editor
      height="90vh"
      defaultLanguage="yaml"
      defaultValue={value}
      value={value}
      onChange={(value) => onChange(value || '')}
      options={{ automaticLayout: true }}
      onMount={handleEditorDidMount}
    />
  );
};

export default MonacoEditorComponent;
