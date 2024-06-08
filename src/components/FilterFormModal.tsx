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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedOptions);
  };

  if (!filterOptions) {
    return null; // or a loading indicator
  }

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-xl font-bold mb-4">Filter Options</h2>
      <form onSubmit={handleSubmit} className="p-4">
        {Object.keys(filterOptions).map((category) => (
          <div key={category} className="mb-4">
            <label className="block font-medium mb-2">{category}</label>
            <div className="flex flex-wrap gap-2">
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
