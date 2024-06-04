"use client";

import React, {useEffect, useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';

import defaultSort from '../defaults/defaultSort.json'
import DownloadButton from "@/components/DownloadButton";
import {parseString, stringify} from "openapi-format";

interface PlaygroundProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

const Playground: React.FC<PlaygroundProps> = ({input, setInput, output, setOutput}) => {
  const [sort, setSort] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<string>('');
  const [sortOptions, setSortOptions] = useState<string>(JSON.stringify(defaultSort, null, 2));
  const [isFilterOptionsCollapsed, setFilterOptionsCollapsed] = useState<boolean>(false);
  const [isSortOptionsCollapsed, setSortOptionsCollapsed] = useState<boolean>(true);
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'yaml'>('yaml');

  useEffect(() => {
    const handleFormat = async () => {
      try {
        const response = await fetch('/api/format', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({openapiString: input, sort, filterOptions, sortOptions, format: outputLanguage}),
        });

        const res = await response.json();
        if (response.ok) {
          console.log(res);
          setOutput(res.data);
        } else {
          setOutput(`Error: ${res.error}`);
        }
      } catch (error) {
        // @ts-ignore
        setOutput(`Error: ${error.message}`);
      }
    };

    if (input) {
      handleFormat();
    }
  }, [input, sort, filterOptions, sortOptions, outputLanguage]);

  const toggleFilterOptions = () => {
    setFilterOptionsCollapsed(!isFilterOptionsCollapsed);
  };

  const toggleSortOptions = () => {
    setSortOptionsCollapsed(!isSortOptionsCollapsed);
  };

  const handleInputChange = (newValue: string) => {
    setInput(newValue);
  };

  return (
    <div className="mt-4 h-screen">
      <div className="flex space-x-4 h-full">
        <div className="w-1/5 flex flex-col">
          <h2 className="text-xl font-bold mb-2">Config</h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">Output format</label>
            <select
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value as 'json' | 'yaml')}
              className="p-2 border rounded w-full"
            >
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="flex items-center font-medium text-gray-700">
              Sort OpenAPI
              <input
                type="checkbox"
                checked={sort}
                onChange={() => setSort(!sort)}
                className="ml-2"
              />
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
                <MonacoEditorWrapper value={filterOptions} onChange={setFilterOptions}/>
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
                <MonacoEditorWrapper value={sortOptions} onChange={setSortOptions} language="json"/>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 h-full">
          <h2 className="text-xl font-bold mb-2">OpenAPI Input</h2>
          <MonacoEditorWrapper value={input} onChange={handleInputChange}/>
        </div>
        <div className="flex-1 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">OpenAPI Output</h2>
            <DownloadButton data={output} filename="openapi-formatted" format={outputLanguage}/>
          </div>
          <div className="flex-1">
            <MonacoEditorWrapper value={output} onChange={setOutput}/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
