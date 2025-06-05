import React, {useEffect, useState} from "react";
import SimpleModal from "./SimpleModal"; // Assuming you have a SimpleModal component
import MonacoEditorWrapper from "./MonacoEditorWrapper";
import ButtonDownload from "./ButtonDownload";
import ButtonUrlModal from "@/components/ButtonUrlModal";
import ButtonUpload from "@/components/ButtonUpload";

interface SortComponentsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (sortingSet: string) => void;
  sortComponentsSet: string;
  defaultSortComponents: string; // default sorting list
  outputLanguage: 'json' | 'yaml';
}

const SortComponentsModal: React.FC<SortComponentsModalProps> = ({isOpen, onRequestClose, onSubmit, sortComponentsSet, outputLanguage, defaultSortComponents}) => {
  const [localSortComponentsSet, setLocalSortComponentsSet] = useState(sortComponentsSet);

  useEffect(() => {
    if (sortComponentsSet) {
      setLocalSortComponentsSet(sortComponentsSet);
    }
  }, [sortComponentsSet]);

  const handleSortLoad = (content: string | null, context: string) => {
    if (context === 'sortComponents' && content) {
      setLocalSortComponentsSet(content);
    }
  };

  // Handle Reset: Reset localSortComponentsSet to default
  const handleReset = () => {
    setLocalSortComponentsSet(defaultSortComponents);
  };

  const handleSubmit = () => {
    onSubmit(localSortComponentsSet);  // Submit the updated sorting set
    onRequestClose();  // Close the modal after submit
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="50%" height="60%">
      <h3 className="text-lg font-semibold mb-4">
        Custom field sorting
      </h3>

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ButtonUrlModal
            context="sortComponents"
            typeTxt="Components Sort"
            onUrlLoad={(content, context) => {
              handleSortLoad(content, context);
            }}
          />
          <ButtonUpload
            context="sortComponents"
            onFileLoad={handleSortLoad}
          />
        </div>
        <div className="flex items-center gap-2">
          <ButtonDownload
            content={localSortComponentsSet}
            filename="oaf-sort-components"
            format={outputLanguage}
            label="Download list"
            className="bg-green-500 text-white text-xs p-2 rounded hover:bg-green-700 focus:outline-none"
          />
          <button
            onClick={handleReset}
            className="bg-yellow-500 text-white text-xs p-2 rounded hover:bg-yellow-600 focus:outline-none"
          >
            Reset
          </button>
        </div>
      </div>

      <div>
        <MonacoEditorWrapper
          value={localSortComponentsSet}  // Local state holding sort options
          onChange={setLocalSortComponentsSet}  // Update the local state when the user edits
          language={outputLanguage === 'json' ? 'json' : 'yaml'}
          height="40vh"
        />
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onRequestClose}
          className="bg-gray-300 dark:bg-gray-500 p-2 rounded hover:bg-gray-400 focus:outline-none"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none"
        >
          Apply Sorting
        </button>
      </div>
    </SimpleModal>
  );
};

export default SortComponentsModal;
