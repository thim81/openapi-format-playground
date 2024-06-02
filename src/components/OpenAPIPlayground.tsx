"use client";

import React, {useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';

interface OpenAPIPlaygroundProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

const OpenAPIPlayground: React.FC<OpenAPIPlaygroundProps> = ({ input, setInput, output, setOutput }) => {

  // const [input, setInput] = useState<string>('');
  // const [output, setOutput] = useState<string>('');

  const handleFormat = async () => {
    try {
      const response = await fetch('/api/format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({openapiString: input}),
      });

      const res = await response.json();
      if (response.ok) {
        console.log(res);
        setOutput(res.formatted.data);
      } else {
        setOutput(`Error: ${res.error}`);
      }
    } catch (error) {
      // @ts-ignore
      setOutput(`Error: ${error.message}`);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between mb-4">
        <button
          onClick={handleFormat}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Format OpenAPI
        </button>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">Input</h2>
          <MonacoEditorWrapper value={input} onChange={setInput} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">Output</h2>
          <MonacoEditorWrapper value={output} onChange={setOutput} />
        </div>
      </div>
    </div>
  );
};

export default OpenAPIPlayground;
