// components/ButtonUrlModal.tsx

import React, { useEffect, useState } from 'react';
import SimpleModal from './SimpleModal';

interface UrlUploadProps {
  context: 'playground' | 'overlay' | 'sort';
  typeTxt?: string;
  onUrlLoad: (content: string | null, context: string) => void;
}

const ButtonUrlModal: React.FC<UrlUploadProps> = ({ context, onUrlLoad, typeTxt= 'OpenAPI' }) => {
  const [url, setUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setErrorMessage(null); // Clear error when URL changes
  };

  // Handle submission of the URL
  const handleSubmit = () => {
    if (!url) {
      setErrorMessage('Please enter a valid URL.');
      return;
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch the file. Please check the URL and try again.');
        }
        return response.text();
      })
      .then((data) => {
        onUrlLoad(data, context);
        setIsModalOpen(false);
      })
      .catch((error) => {
        console.error('Error fetching OpenAPI file:', error);
        setErrorMessage(error.message); // Set error message
      });
  };

  // Function to open the modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMessage(null); // Clear error when closing the modal
  };

  return (
    <>
      {/* Button to open the modal */}
      <button
        type="button" // Explicitly set type
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
        className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-2 rounded"
      >
        Import URL
      </button>

      {/* Modal window */}
      <SimpleModal isOpen={isModalOpen} onRequestClose={closeModal} width="50%" height="auto" zIndex={60}>
        <h2 className="text-xl font-semibold mb-4">Import {typeTxt} File from URL</h2>

        {/* Error Message */}
        {errorMessage && (
          <div className="error-message bg-red-100 text-red-700 p-2 mb-4 rounded">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder={`Enter ${typeTxt} file URL`}
            value={url}
            onChange={handleUrlChange}
            className="p-2 border rounded w-full bg-white text-black dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded"
          >
            Import URL
          </button>
        </div>
      </SimpleModal>
    </>
  );
};

export default ButtonUrlModal;
