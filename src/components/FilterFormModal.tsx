// components/FilterFormModal.tsx

import React, { useState, useEffect } from 'react';
import SimpleModal from './SimpleModal';
import {AnalyzeOpenApiResult} from "openapi-format";

interface FilterFormModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (selectedOptions: any) => void;
  filterOptions: AnalyzeOpenApiResult;
}

const FilterFormModal: React.FC<FilterFormModalProps> = ({ isOpen, onRequestClose, onSubmit, filterOptions }) => {
  const [selectedOptions, setSelectedOptions] = useState<any>({});

  useEffect(() => {
    if (filterOptions) {
      // Remove "paths"
      delete filterOptions.paths
      Object.keys(filterOptions).forEach(key => {
        // Remove keys with empty arrays
        if (filterOptions[key].length === 0) {
          delete filterOptions[key];
        }
      });
      const initialSelectedOptions: any = {};
      Object.keys(filterOptions).forEach((category) => {
        initialSelectedOptions[category] = [];
      });
      setSelectedOptions(initialSelectedOptions);
    }
  }, [filterOptions]);

  const handleChange = (category: string, value: string) => {
    setSelectedOptions((prev: any) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v: string) => v !== value)
        : [...prev[category], value]
    }));
  };

  const handleSelectAll = (category: string) => {
    setSelectedOptions((prev: any) => ({
      ...prev,
      [category]: selectedOptions[category].length === filterOptions[category].length
        ? []
        : [...filterOptions[category]]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedSelectedOptions = Object.fromEntries(
      Object.entries(selectedOptions).filter(([_, value]) => value.length > 0)
    );
    onSubmit(cleanedSelectedOptions);
  };

  if (!filterOptions) {
    return null;
  }

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="60%">
      <h2 className="text-xl font-bold mb-4">Filter Options</h2>
      <form onSubmit={handleSubmit} className="px-4">
        {Object.keys(filterOptions).map((category) => (
          <div key={category} className="mb-4">
            <div className="flex items-center mb-2">
              <label className="block font-medium mr-4">{category}</label>
              <button
                type="button"
                onClick={() => handleSelectAll(category)}
                className="text-sm text-blue-500"
              >
                {selectedOptions[category]?.length === filterOptions[category].length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className={`grid gap-2 ${filterOptions[category].length > 4 ? 'grid-cols-4' : 'grid-cols-1'}`}>
              {filterOptions[category].map((option: string) => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${category}-${option}`}
                    value={option}
                    checked={selectedOptions[category]?.includes(option) || false}
                    onChange={() => handleChange(category, option)}
                    className="mr-2"
                  />
                  <label htmlFor={`${category}-${option}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onRequestClose} className="bg-gray-300 p-2 rounded">Cancel</button>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Submit</button>
        </div>
      </form>
    </SimpleModal>
  );
};

export default FilterFormModal;
