// components/DownloadButton.tsx
import React from 'react';
import {saveAs} from 'file-saver';
import {parseString, stringify} from "openapi-format";

interface DownloadButtonProps {
  data: string;
  filename: string;
  format: 'json' | 'yaml';
}

const DownloadButton: React.FC<DownloadButtonProps> = ({data, filename, format}) => {
  const handleDownload = async () => {
    let blob;
    const content = await parseString(data)
    if (format === 'json') {
      const jsonString = await stringify(content, {format: 'json'});
      blob = new Blob([jsonString], {type: 'application/json'}) as Blob;
      saveAs(blob, `${filename}.${format}`);
    } else if (format === 'yaml') {
      const yamlString = await stringify(content, {format: 'yaml'});
      blob = new Blob([yamlString], {type: 'application/x-yaml'}) as Blob;
      saveAs(blob, `${filename}.${format}`);
    }
  };

  return (
    <button onClick={handleDownload} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
      Download
    </button>
  );
};

export default DownloadButton;
