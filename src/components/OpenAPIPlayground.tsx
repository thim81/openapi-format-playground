"use client";

import React, { useState } from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';

const OpenAPIPlayground: React.FC = () => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');

    const handleFormat = async () => {
        try {
            const response = await fetch('/api/format', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ openapiString: input }),
            });

            const res = await response.json();
            if (response.ok) {
                console.log(res.formatted.data);
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
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={handleFormat}>Format OpenAPI</button>
            </div>
            <div style={{ display: 'flex' }}>
                <div style={{ flex: 1 }}>
                    <h2>Input</h2>
                    <MonacoEditorWrapper value={input} onChange={setInput} />
                </div>
                <div style={{ flex: 1 }}>
                    <h2>Output</h2>
                    <MonacoEditorWrapper value={output} onChange={setOutput} />
                </div>
            </div>
        </div>
    );
};

export default OpenAPIPlayground;
