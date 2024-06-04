"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MonacoEditorComponent with ssr: false
const MonacoEditorComponent = dynamic(() => import('./MonacoEditorComponent'), {
  ssr: false,
});

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

const MonacoEditorWrapper: React.FC<MonacoEditorProps> = ({value, onChange, language}) => {
  return <MonacoEditorComponent value={value} onChange={onChange} language={language}/>;
};

export default MonacoEditorWrapper;
