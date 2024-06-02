"use client";

import React, {useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';

interface OpenApiPlaygroundProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

const OpenApiPlayground: React.FC<OpenApiPlaygroundProps> = ({input, setInput, output, setOutput}) => {
  const [sort, setSort] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<string>('');
  const [sortOptions, setSortOptions] = useState<string>('');
  const [isFilterOptionsCollapsed, setFilterOptionsCollapsed] = useState<boolean>(false);
  const [isSortOptionsCollapsed, setSortOptionsCollapsed] = useState<boolean>(true);

  const handleFormat = async () => {
    try {
      const response = await fetch('/api/format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({openapiString: input, sort: sort, filterOptions: filterOptions}),
      });

      const res = await response.json();
      if (response.ok) {
        console.log(res);
        setOutput(res.formatted.data);
      } else {
        setOutput(`Error: ${res.error}`);
      }
    } catch (error) {
      // @ts-ignore
      setOutput(`Error: ${error.message}`);
    }
  };

  const toggleFilterOptions = () => {
    setFilterOptionsCollapsed(!isFilterOptionsCollapsed);
    setSortOptionsCollapsed(isFilterOptionsCollapsed); // Collapse Sort options when Filter options is expanded
  };

  const toggleSortOptions = () => {
    setSortOptionsCollapsed(!isSortOptionsCollapsed);
    setFilterOptionsCollapsed(isSortOptionsCollapsed); // Collapse Filter options when Sort options is expanded
  };

  return (
    <div className="mt-4 h-screen">
      <div className="flex justify-between mb-4">
        <button
          onClick={handleFormat}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Format OpenAPI
        </button>
      </div>
      <div className="flex space-x-4 h-full">
        <div className="w-1/4 flex flex-col">
          <h2 className="text-xl font-bold mb-2">Config</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sort}
                onChange={() => setSort(!sort)}
                className="mr-2"
              />
              Sort
            </label>
          </div>
          <div className="flex-1 overflow-auto mb-4">
            <h3
              className="text-lg font-semibold mb-2 cursor-pointer"
              onClick={toggleFilterOptions}
            >
              Filter options {isFilterOptionsCollapsed ? '▼' : '▲'}
            </h3>
            {!isFilterOptionsCollapsed && (
              <div className="h-full">
                <MonacoEditorWrapper value={filterOptions} onChange={setFilterOptions} />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <h3
              className="text-lg font-semibold mb-2 cursor-pointer"
              onClick={toggleSortOptions}
            >
              Sort options {isSortOptionsCollapsed ? '▼' : '▲'}
            </h3>
            {!isSortOptionsCollapsed && (
              <div className="h-full">
                <MonacoEditorWrapper value={sortOptions} onChange={setSortOptions} />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 h-full">
          <h2 className="text-xl font-bold mb-2">Input</h2>
          <MonacoEditorWrapper value={input} onChange={setInput}/>
        </div>
        <div className="flex-1 h-full">
          <h2 className="text-xl font-bold mb-2">Output</h2>
          <MonacoEditorWrapper value={output} onChange={setOutput}/>
        </div>
      </div>
    </div>
  );
};

export default OpenApiPlayground;
