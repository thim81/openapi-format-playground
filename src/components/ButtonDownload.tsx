// components/ButtonDownload.tsx
import React from 'react';
import {saveAs} from 'file-saver';
import {parseString, stringify} from "openapi-format";

interface ButtonDownloadProps {
  openapi: string;
  filename: string;
  format: 'json' | 'yaml';
}

const ButtonDownload: React.FC<ButtonDownloadProps> = ({openapi, filename, format}) => {
  const handleDownload = async () => {
    let blob;
    const obj = await parseString(openapi)
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

  return (
    <button onClick={handleDownload} className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded">
      Download Output
    </button>
  );
};

export default ButtonDownload;
