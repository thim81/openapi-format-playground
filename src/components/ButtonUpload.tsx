// components/ButtonUpload.tsx
import React, {useState} from 'react';
import {parseString, stringify} from "openapi-format";

interface FileUploadProps {
  onFileLoad: (content: string | null) => void;
}

const ButtonUpload: React.FC<FileUploadProps> = ({onFileLoad}) => {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileType = file.type;
        let content;

        if (fileType === 'application/json' || fileType === 'text/yaml' || fileType === 'application/x-yaml') {
          content = await parseString(e.target?.result as string);
        } else {
          throw new Error('Unsupported file type');
        }

        setError(null);
        onFileLoad(await stringify(content));
      } catch (err) {
        setError('Invalid file content or unsupported file type');
        onFileLoad(null);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      onFileLoad(null);
    };

    reader.readAsText(file);
    // Clear the input value to allow the same file to be uploaded again
    event.target.value = '';
  };

  return (
    <div>
      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded">
        Upload File
      </label>
      <input
        id="file-upload"
        type="file"
        accept=".json,.yaml,.yml"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default ButtonUpload;
