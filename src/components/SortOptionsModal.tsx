import React, {useEffect, useState} from "react";
import SimpleModal from "./SimpleModal"; // Assuming you have a SimpleModal component
import MonacoEditorWrapper from "./MonacoEditorWrapper";
import ButtonDownload from "./ButtonDownload";
import {OpenAPISortSet, parseString} from "openapi-format";
import ButtonUrlModal from "@/components/ButtonUrlModal";
import ButtonUpload from "@/components/ButtonUpload";

interface SortOptionsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (sortingSet: OpenAPISortSet) => void;
  sortSet: any;
  defaultSort: any; // Adding a prop for default sorting options
  outputLanguage: 'json' | 'yaml';
}

const SortOptionsModal: React.FC<SortOptionsModalProps> = ({isOpen, onRequestClose, onSubmit, sortSet, outputLanguage,defaultSort}) => {
  const [localSortSet, setLocalSortSet] = useState(sortSet);

  useEffect(() => {
    if (sortSet) {
      setLocalSortSet(sortSet);
    }
  }, [sortSet]);

  const handleSortLoad = (content: string | null, context: string) => {
    if (context === 'sort' && content) {
      setLocalSortSet(content);
    }
  };

  // Handle Reset: Reset localSortSet to defaultSort
  const handleReset = () => {
    setLocalSortSet(defaultSort);
  };

  const handleSubmit = () => {
    onSubmit(localSortSet);  // Submit the updated sorting set
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
            context="sort"
            typeTxt="Custom Sort"
            onUrlLoad={(content, context) => {
              handleSortLoad(content, context);
            }}
          />
          <ButtonUpload
            context="sort"
            onFileLoad={handleSortLoad}
          />
        </div>
        <div className="flex items-center gap-2">
          <ButtonDownload
            content={localSortSet}
            filename="oaf-sort"
            format={outputLanguage}
            label="Download sort"
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
          value={localSortSet}  // Local state holding sort options
          onChange={setLocalSortSet}  // Update the local state when the user edits
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

export default SortOptionsModal;
