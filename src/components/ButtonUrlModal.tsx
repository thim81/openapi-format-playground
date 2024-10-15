import React, {useState} from 'react';
import SimpleModal from './SimpleModal';

interface UrlUploadProps {
  onUrlLoad: (content: string | null) => void;
}

const ButtonUrlModal: React.FC<UrlUploadProps> = ({onUrlLoad}) => {
  const [url, setUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  // Handle submission of the URL
  const handleSubmit = () => {
    if (url) {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then((data) => {
          onUrlLoad(data);
          setIsModalOpen(false);
        })
        .catch((error) => console.error('Error fetching OpenAPI file:', error));
    } else {
      alert('Please enter a valid URL');
    }
  };

  // Function to open the modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Button to open the modal */}
      <button
        onClick={openModal}
        className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded"
      >
        Import URL
      </button>

      {/* Modal window */}
      <SimpleModal isOpen={isModalOpen} onRequestClose={closeModal} width="50%" height="auto">
        <h2 className="text-xl font-semibold mb-4">Import OpenAPI File from URL</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Enter OpenAPI file URL"
            value={url}
            onChange={handleUrlChange}
            className="p-2 border rounded w-full"
          />
          <button
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
