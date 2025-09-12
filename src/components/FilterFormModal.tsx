// components/FilterFormModal.tsx

import React, {useState, useEffect} from 'react';
import SimpleModal from './SimpleModal';
import {AnalyzeOpenApiResult} from "openapi-format";

interface FilterFormModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (selectedOptions: any) => void;
  filterOptions: AnalyzeOpenApiResult;
}

type SelectedOptions = {
  [key: string]: string[];
};

const FilterFormModal: React.FC<FilterFormModalProps> = ({isOpen, onRequestClose, onSubmit, filterOptions}) => {
  const totalItems = Object.values(filterOptions).reduce((acc, array) => acc + (array?.length ?? 0), 0);

  const dynamicHeight = totalItems > 50 ? '98%' : totalItems > 20 ? '74%' : '50%';
  // console.log(Object.keys(filterOptions).length)
  // console.log((filterOptions))

  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});

  useEffect(() => {
    if (filterOptions) {
      // Remove "paths"
      delete filterOptions.paths;
      Object.keys(filterOptions).forEach(key => {
        const value = filterOptions[key];
        if (Array.isArray(value)) {
          // Remove duplicates
          filterOptions[key] = Array.from(new Set(value));
        }
        if (value && value.length === 0) {
          // Remove keys with empty arrays
          delete filterOptions[key];
        }
      });
      const initialSelectedOptions: SelectedOptions = {};
      Object.keys(filterOptions).forEach((category) => {
        initialSelectedOptions[category] = [];
      });
      setSelectedOptions(initialSelectedOptions);
    }
  }, [filterOptions]);

  const handleChange = (category: string, value: string) => {
    setSelectedOptions((prev: SelectedOptions) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v: string) => v !== value)
        : [...prev[category], value]
    }));
  };

  const handleSelectAll = (category: string) => {
    setSelectedOptions((prev: SelectedOptions) => {
      const selectedCategory = selectedOptions[category] || [];
      const filterCategory = filterOptions[category] || [];

      return {
        ...prev,
        [category]: selectedCategory.length === filterCategory.length
          ? []
          : [...filterCategory]
      };
    });
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

  const calculateColumns = (options: string[]) => {
    const totalCharacters = options.reduce((sum, option) => sum + option.length, 0);
    const averageCharactersPerOption = totalCharacters / options.length;
    if (averageCharactersPerOption < 16) return 4;
    if (averageCharactersPerOption < 30) return 3;
    if (averageCharactersPerOption < 40) return 2;
    return 1;
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="70%" height={dynamicHeight}>
      <h2 className="text-xl font-bold mb-4">Filter Options</h2>
      <form onSubmit={handleSubmit} className="px-4">
        {Object.keys(filterOptions).map((category) => {
          const options = (filterOptions[category] || []).sort();
          const numColumns = calculateColumns(options);
          return (
            <div key={category} className="mb-4">
              <div className="flex items-center mb-2">
                <label className="block font-medium mr-4">{category}</label>
                <button
                  type="button"
                  onClick={() => handleSelectAll(category)}
                  className="text-sm text-blue-500"
                >
                  {selectedOptions[category]?.length === options.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div
                className={`grid gap-2 ${numColumns === 4 ? 'grid-cols-4' : numColumns === 3 ? 'grid-cols-3' : numColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {options.map((option: string) => (
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
          );
        })}
        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-950 py-3 mt-2 border-t flex justify-end space-x-2">
          <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-500 p-2 rounded">Cancel</button>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Apply Filter</button>
        </div>
      </form>
    </SimpleModal>
  );
};

export default FilterFormModal;
