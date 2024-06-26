"use client";

import React, {useCallback, useEffect, useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';
import DiffEditorModal from './DiffEditorModal';
import FilterFormModal from './FilterFormModal';
import useDebounce from '@/hooks/useDebounce';
import ButtonDownload from '@/components/ButtonDownload';
import ButtonShare from "@/components/ButtonShare";

import defaultSort from '../defaults/defaultSort.json'

import {analyzeOpenApi, AnalyzeOpenApiResult, OpenAPIFilterSet, parseString, stringify} from "openapi-format";
import {OpenAPIV3} from "openapi-types";
import {DecodedShareUrl, decodeShareUrl, includeUnusedComponents} from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import ButtonUpload from "@/components/ButtonUpload";
import MetricsBar, {ComponentMetrics} from "@/components/MetricsBar";

const defaultCompMetrics = {
  schemas: [],
  responses: [],
  parameters: [],
  examples: [],
  requestBodies: [],
  headers: [],
  meta: {
    total: 0
  }
}

interface PlaygroundProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  setOutput: (value: string) => void;
}

export interface PlaygroundConfig extends openapiFormatConfig {
  isFilterOptionsCollapsed?: boolean;
  isSortOptionsCollapsed?: boolean;
  outputLanguage?: 'json' | 'yaml';
}

export interface openapiFormatConfig {
  sort?: boolean;
  filterSet?: string;
  sortSet?: string;
  format?: string;
}

const Playground: React.FC<PlaygroundProps> = ({input, setInput, output, setOutput}) => {
  const [sort, setSort] = useState<boolean>(true);
  const [filterUnused, setFilterUnused] = useState<boolean>(false);
  const [filterSet, setFilterSet] = useState<string>('');
  const [sortSet, setSortSet] = useState<string>(JSON.stringify(defaultSort, null, 2));
  const [isFilterOptionsCollapsed, setFilterOptionsCollapsed] = useState<boolean>(false);
  const [isSortOptionsCollapsed, setSortOptionsCollapsed] = useState<boolean>(true);
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'yaml'>('yaml');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiffModalOpen, setDiffModalOpen] = useState(false);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [filterFormOptions, setFilterFormOptions] = useState<AnalyzeOpenApiResult>({});
  const [selectedOptions, setSelectedOptions] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [components, setComponents] = useState<ComponentMetrics>(defaultCompMetrics);
  const [unusedComponents, setUnusedComponents] = useState<ComponentMetrics>(defaultCompMetrics);

  const [totalComponents, setTotalComponents] = useState(0);
  const [totalUnusedComponents, setTotalUnusedComponents] = useState(0);
  const [totalTags, setTotalTags] = useState(0);
  const [totalPaths, setTotalPaths] = useState(0);

  const dInput = useDebounce(input, 1000);
  const dFilterSet = useDebounce(filterSet, 1000);
  const dSortSet = useDebounce(sortSet, 1000);

  const config = {
    sort,
    filterSet,
    sortSet,
    isFilterOptionsCollapsed,
    isSortOptionsCollapsed,
    outputLanguage
  } || {} as PlaygroundConfig;

  const handleInputChange = useCallback(async (newValue: string) => {
    setLoading(true);
    setErrorMessage(null);
    const oaObj = await parseString(newValue) as OpenAPIV3.Document;
    const oaElements = analyzeOpenApi(oaObj);
    setTotalPaths(oaElements.operations?.length || 0);
    setTotalTags(oaElements.tags?.length || 0);
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
            openapi: dInput,
            config: {
              sort,
              filterSet: dFilterSet,
              sortSet: dSortSet,
              format: outputLanguage
            }
          }),
        });

        const res = await response.json();
        if (response.ok) {
          setOutput(res.data);
          setTotalComponents(res.resultData?.totalComp?.meta?.total || 0);
          setTotalUnusedComponents(res.resultData?.unusedComp?.meta?.total || 0);
          setComponents(res.resultData?.totalComp || defaultCompMetrics);
          setUnusedComponents(res.resultData?.unusedComp || defaultCompMetrics);
          setErrorMessage(null);
          setLoading(false);
        } else {
          setErrorMessage(`Error: ${res.message}`);
          setLoading(false);
        }
      } catch (error) {
        setErrorMessage(`Error: ${error}`);
        setLoading(false);
      }
    };

    if (dInput) {
      handleFormat();
    } else {
      // Empty output when the input is cleared
      setOutput('');
    }
    setLoading(false);
  }, [dInput, sort, dFilterSet, dSortSet, outputLanguage, setOutput]);

  // Decode Share URL
  useEffect(() => {
    const decodeUrl = async () => {
      if (typeof window !== 'undefined') {
        setLoading(true);
        const url = window.location.href;
        const result = await decodeShareUrl(url) as DecodedShareUrl;
        if (result?.openapi) {
          await handleInputChange(result.openapi);
        }
        if (result?.config) {
          setSort(result.config.sort ?? true);
          setFilterSet(result.config.filterSet ?? '');
          setSortSet(result.config.sortSet ?? JSON.stringify(defaultSort, null, 2));
          setFilterOptionsCollapsed(result.config.isFilterOptionsCollapsed ?? false);
          setSortOptionsCollapsed(result.config.isSortOptionsCollapsed ?? true);
          setOutputLanguage(result.config.outputLanguage ?? 'yaml');
          setFilterUnused(result?.config?.filterSet?.includes('unusedComponents') ?? false);
        }
        setLoading(false);
      }
    };

    decodeUrl();
  }, [handleInputChange]);

  const toggleFilterUnused = async () => {
    let filterSetObj: OpenAPIFilterSet;
    if (filterSet.trim()) {
      filterSetObj = await parseString(filterSet) as OpenAPIFilterSet;
    } else {
      filterSetObj = {};
    }
    includeUnusedComponents(filterSetObj, !filterUnused);
    let filterSetString = await stringify(filterSetObj) as string;
    filterSetString = (filterSetString.trim() == '{}') ? '' : filterSetString;
    setFilterSet(filterSetString);
    setFilterUnused(!filterUnused);
  };

  const openDiffModal = () => {
    setDiffModalOpen(true);
  };

  const openFormModal = () => {
    setFormModalOpen(true);
  };

  const handleFileLoad = async (content: string | null) => {
    setLoading(true);
    await handleInputChange(content || '');
  };

  const handleFormSubmit = async (selectedOptions: any) => {
    const _selectedOptions = Object.fromEntries(
      Object.entries(selectedOptions).filter(([_, value]) => (value as string[]).length > 0)
    );
    includeUnusedComponents(_selectedOptions, filterUnused);
    const filterFormOptionsString = await stringify(_selectedOptions);
    setFilterSet(filterFormOptionsString);
    setSelectedOptions(_selectedOptions);
    setFormModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        {errorMessage && (
          <div className="error-message bg-red-100 text-red-700 p-2 mb-4 rounded">
            {errorMessage}
          </div>
        )}
        <div className="flex space-x-4 flex-grow">
          <div className="w-1/5 flex flex-col h-full overflow-auto mb-2">
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
            <div className="mb-4">
              <h3
                className="text-lg font-semibold mb-2 cursor-pointer"
                onClick={() => setFilterOptionsCollapsed(!isFilterOptionsCollapsed)}
              >
                Filter options {isFilterOptionsCollapsed ? '▲' : '▼'}
              </h3>
              {!isFilterOptionsCollapsed && (
                <div>
                  <MonacoEditorWrapper value={filterSet} onChange={setFilterSet} height='40vh'/>
                </div>
              )}
              <label className="flex items-center font-medium text-gray-700">
                Filter Unused Components
                <input
                  type="checkbox"
                  checked={filterUnused}
                  onChange={toggleFilterUnused}
                  className="ml-2"
                />
              </label>
            </div>
            <div className="flex-1">
              <h3
                className="text-lg font-semibold mb-2 cursor-pointer"
                onClick={() => setSortOptionsCollapsed(!isSortOptionsCollapsed)}
              >
                Sort options {isSortOptionsCollapsed ? '▲' : '▼'}
              </h3>
              {!isSortOptionsCollapsed && (
                <div>
                  <MonacoEditorWrapper value={sortSet} onChange={setSortSet} language="json" height='40vh'/>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">OpenAPI Input</h2>
              <ButtonUpload onFileLoad={handleFileLoad}/>
            </div>
            <MonacoEditorWrapper value={input} onChange={handleInputChange}/>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">OpenAPI Output</h2>
              {loading && <LoadingSpinner/>}
              <div className="space-x-2">
                <button onClick={openDiffModal}
                        className="bg-white hover:bg-gray-200 text-green-500 font-medium text-sm py-1 px-4 rounded border border-green-500">
                  Show Diff
                </button>
                <ButtonShare openapi={input} config={config}/>
                <ButtonDownload openapi={output} filename="openapi-formatted" format={outputLanguage}/>
              </div>
            </div>
            <MonacoEditorWrapper value={output} onChange={setOutput}/>
          </div>
        </div>
      </div>

      <MetricsBar
        totalPaths={totalPaths}
        totalTags={totalTags}
        totalComponents={totalComponents}
        totalUnusedComponents={totalUnusedComponents}
        components={components}
        unusedComponents={unusedComponents}
      />

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
