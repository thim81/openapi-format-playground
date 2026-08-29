import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { resolveMonacoTheme } from './monacoTheme';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'yaml',
  height = '100%',
  readOnly = false,
  showLineNumbers = true,
}) => {
  const { theme } = useTheme();

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(val) => onChange?.(val || '')}
      theme={resolveMonacoTheme(theme)}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbersMinChars: showLineNumbers ? 3 : 0,
        glyphMargin: false,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: showLineNumbers ? 'gutter' : 'none',
        folding: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
    />
  );
};

export default MonacoEditor;
