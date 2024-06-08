"use client";

import React, {useCallback, useEffect, useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';
import DiffEditorModal from './DiffEditorModal';
import FilterFormModal from './FilterFormModal';
import useDebounce from '@/hooks/useDebounce';
import ButtonDownload from '@/components/ButtonDownload';
import ButtonShare from "@/components/ButtonShare";

import defaultSort from '../defaults/defaultSort.json'

import {ungzip} from 'pako';
import {Base64} from 'js-base64';
import {analyzeOpenApi, AnalyzeOpenApiResult, parseString, stringify} from "openapi-format";
import {OpenAPIV3} from "openapi-types";
import {decodeShareUrl} from "@/utils";

interface PlaygroundProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

export interface PlaygroundConfig {
  sort: boolean;
  filterOptions: string;
  sortOptions: string;
  isFilterOptionsCollapsed: boolean;
  isSortOptionsCollapsed: boolean;
  outputLanguage: 'json' | 'yaml';
}

const Playground: React.FC<PlaygroundProps> = ({input, setInput, output, setOutput}) => {
  const [sort, setSort] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<string>('');
  const [sortOptions, setSortOptions] = useState<string>(JSON.stringify(defaultSort, null, 2));
  const [isFilterOptionsCollapsed, setFilterOptionsCollapsed] = useState<boolean>(false);
  const [isSortOptionsCollapsed, setSortOptionsCollapsed] = useState<boolean>(true);
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'yaml'>('yaml');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiffModalOpen, setDiffModalOpen] = useState(false);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [filterFormOptions, setFilterFormOptions] = useState<AnalyzeOpenApiResult>({});
  const [selectedOptions, setSelectedOptions] = useState<any>({});

  const dInput = useDebounce(input, 600);
  const dFilterOptions = useDebounce(filterOptions, 600);
  const dSortOptions = useDebounce(sortOptions, 600);

  const config = {
    sort,
    filterOptions,
    sortOptions,
    isFilterOptionsCollapsed,
    isSortOptionsCollapsed,
    outputLanguage
  } || {} as PlaygroundConfig;

  const handleInputChange = useCallback(async (newValue: string) => {
    const oaObj = await parseString(newValue) as OpenAPIV3.Document;
    const oaElements = analyzeOpenApi(oaObj);
    setFilterFormOptions(oaElements);
    setInput(newValue);
  }, [setInput]);

  useEffect(() => {
    const handleFormat = async () => {
      try {
        const response = await fetch('/api/format', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            openapiString: dInput,
            sort,
            filterOptions: dFilterOptions,
            sortOptions: dSortOptions,
            format: outputLanguage,
          }),
        });

        const res = await response.json();
        if (response.ok) {
          // console.log(res);
          setOutput(res.data);
          setErrorMessage(null);
        } else {
          setErrorMessage(`Error: ${res.error}`);
        }
      } catch (error) {
        setErrorMessage(`Error: ${error}`);
      }
    };

    if (dInput) {
      handleFormat();
    }
  }, [dInput, sort, dFilterOptions, dSortOptions, outputLanguage, setOutput]);

  // Decode Share URL
  useEffect(() => {
    const decodeUrl = async () => {
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        const result = await decodeShareUrl(url);
        if (result?.openapi) {
          await handleInputChange(result.openapi)
        }

        if (result?.config) {
          setSort(result.config.sort ?? true);
          setFilterOptions(result.config.filterOptions ?? '');
          setSortOptions(result.config.sortOptions ?? JSON.stringify(defaultSort, null, 2));
          setFilterOptionsCollapsed(result.config.isFilterOptionsCollapsed ?? false);
          setSortOptionsCollapsed(result.config.isSortOptionsCollapsed ?? true);
          setOutputLanguage(result.config.outputLanguage ?? 'yaml');
        }
      }
    };

    decodeUrl();
  }, [handleInputChange]);

  const toggleFilterOptions = () => {
    setFilterOptionsCollapsed(!isFilterOptionsCollapsed);
  };

  const toggleSortOptions = () => {
    setSortOptionsCollapsed(!isSortOptionsCollapsed);
  };

  const openDiffModal = () => {
    setDiffModalOpen(true);
  };

  const openFormModal = () => {
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (selectedOptions: any) => {
    const _selectedOptions = Object.fromEntries(
      Object.entries(selectedOptions).filter(([_, value]) => (value as string[]).length > 0)
    );
    const filterFormOptionsString = await stringify(_selectedOptions);
    console.log('filterFormOptionsString', filterFormOptionsString);
    setFilterOptions(filterFormOptionsString);
    setSelectedOptions(_selectedOptions);
    setFormModalOpen(false);
  };

  return (
    <div className="mt-4 h-screen">
      <div className="flex flex-col h-full">
        {errorMessage && (
          <div className="error-message bg-red-100 text-red-700 p-2 mb-4 rounded">
            {errorMessage}
          </div>
        )}
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
              <div className="space-x-4">
                <button onClick={openDiffModal}
                        className="bg-white hover:bg-gray-200 text-green-500 font-medium text-sm py-1 px-4 rounded border border-green-500">Show
                  Diff
                </button>
                <ButtonShare openapi={input} config={config}/>
                <ButtonDownload openapi={output} filename="openapi-formatted" format={outputLanguage}/>
              </div>
            </div>
            <div className="flex-1">
              <MonacoEditorWrapper value={output} onChange={setOutput}/>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(filterFormOptions).length > 0 && (
        <button onClick={openFormModal}
                className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg">
          Open Filter Form
        </button>
      )}

      <FilterFormModal
        isOpen={isFormModalOpen}
        onRequestClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        filterOptions={filterFormOptions}
      />

      <DiffEditorModal
        isOpen={isDiffModalOpen}
        onRequestClose={() => setDiffModalOpen(false)}
        original={input}
        modified={output}
        language={outputLanguage}
      />
    </div>
  );
};

export default Playground;
