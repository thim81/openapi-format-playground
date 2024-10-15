// components/ButtonDownload.tsx
import React from 'react';
import {saveAs} from 'file-saver';
import {parseString, stringify} from "openapi-format";

interface ButtonDownloadProps {
  content: string;
  filename: string;
  format: 'json' | 'yaml';
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ButtonDownload: React.FC<ButtonDownloadProps> = ({ content, filename, format, label, className, onClick }) => {
  const handleDownload = async () => {
    let blob;
    const obj = await parseString(content)
    if (format === 'json') {
      const jsonString = await stringify(obj, {format: 'json'});
      blob = new Blob([jsonString], {type: 'application/json'}) as Blob;
      saveAs(blob, `${filename}.${format}`);
    } else if (format === 'yaml') {
      const yamlString = await stringify(obj, {format: 'yaml'});
      blob = new Blob([yamlString], {type: 'application/x-yaml'}) as Blob;
      saveAs(blob, `${filename}.${format}`);
    }
  };
  const classes = className || "bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded"

  return (
    <button onClick={(e) => {
      e.stopPropagation();
      handleDownload();
    }} className={classes}>
      {label || 'Download'}
    </button>
  );
};

export default ButtonDownload;
