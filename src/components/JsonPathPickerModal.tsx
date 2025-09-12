import React, { useMemo, useState } from 'react';
import SimpleModal from './SimpleModal';

interface JsonPathPickerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  suggestions: string[];
  onPick: (value: string) => void;
}

const JsonPathPickerModal: React.FC<JsonPathPickerModalProps> = ({ isOpen, onRequestClose, suggestions, onPick }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 1000);
  }, [suggestions, query]);

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="60%" height="70%" zIndex={60}>
      <div className="flex items-center justify-between mb-2 pt-4">
        <h3 className="text-lg font-semibold">Pick a JSONPath target</h3>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="p-2 border rounded w-1/2 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div className="border rounded h-[70%] overflow-auto p-2 dark:bg-gray-900">
        {filtered.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onPick(s);
              onRequestClose();
            }}
            className="block text-left w-full px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex justify-end space-x-2 mt-2">
        <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-600 p-2 rounded">Close</button>
      </div>
    </SimpleModal>
  );
};

export default JsonPathPickerModal;

