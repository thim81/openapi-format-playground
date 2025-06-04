"use client";

import React, {useCallback, useEffect, useState} from 'react';
import MonacoEditorWrapper from './MonacoEditorWrapper';
import DiffEditorModal from './DiffEditorModal';
import FilterFormModal from './FilterFormModal';
import useDebounce from '@/hooks/useDebounce';
import ButtonDownload from '@/components/ButtonDownload';
import ButtonShare from "@/components/ButtonShare";

import defaultSort from '../defaults/defaultSort.json'
import defaultSortComponents from '../defaults/defaultSortComponents.json'

import {
  analyzeOpenApi,
  AnalyzeOpenApiResult,
  OpenAPIFilterSet,
  OpenAPISortSet,
  parseString,
  stringify
} from "openapi-format";
import {OpenAPIV3} from "openapi-types";
import {DecodedShareUrl, decodeShareUrl, includePreserve, includeUnusedComponents} from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import ButtonUpload from "@/components/ButtonUpload";
import MetricsBar, {ComponentMetrics} from "@/components/MetricsBar";
import InstructionsModal from "@/components/InstructionsModal";
import RawConfigModal from "@/components/RawConfigModal";
import GenerateFormModal from "@/components/GenerateFormModal";
import CasingFormModal from "@/components/CasingFormModal";
import SortOptionsModal from "@/components/SortOptionsModal";
import SortComponentsModal from "@/components/SortComponentsModal";
import ButtonUrlModal from "@/components/ButtonUrlModal";
import OverlayModal from "@/components/OverlayModal";

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
  toggleGenerate?: boolean;
  toggleCasing?: boolean;
  toggleOverlay?: boolean;
  defaultFieldSorting?: boolean;
  pathSort?: 'original' | 'path' | 'tags';
  outputLanguage?: 'json' | 'yaml';
}

export interface openapiFormatConfig {
  sort?: boolean;
  keepComments?: boolean;
  filterSet?: string;
  sortSet?: string;
  sortComponentsSet?: string;
  overlaySet?: string;
  generateSet?: string;
  casingSet?: string;
  format?: string;
}

const Playground: React.FC<PlaygroundProps> = ({input, setInput, output, setOutput}) => {
  const [sort, setSort] = useState<boolean>(true);
  const [keepComments, setKeepComments] = useState<boolean>(false);
  const [filterUnused, setFilterUnused] = useState<boolean>(false);
  const [filterPrevent, setFilterPrevent] = useState<boolean>(false);
  const [filterSet, setFilterSet] = useState<string>('');
  const [generateSet, setGenerateSet] = useState<string>('');
  const [toggleGenerate, setToggleGenerate] = useState<boolean>(false);
  const [casingSet, setCasingSet] = useState<string>('');
  const [toggleCasing, setToggleCasing] = useState<boolean>(false);
  const [toggleOverlay, setToggleOverlay] = useState<boolean>(false);
  const [defaultSortSet, setDefaultSortSet] = useState<string>('');
  const [customSortSet, setCustomSortSet] = useState<string>(defaultSortSet);
  const [sortSet, setSortSet] = useState<string>(defaultSortSet);
  const [defaultSortComponentsSet, setDefaultSortComponentsSet] = useState<string>('');
  const [customSortComponentsSet, setCustomSortComponentsSet] = useState<string>(defaultSortComponentsSet);
  const [sortComponentsSet, setSortComponentsSet] = useState<string>(defaultSortComponentsSet);
  const [overlaySet, setOverlaySet] = useState<string>('');
  const [isFilterOptionsCollapsed, setFilterOptionsCollapsed] = useState<boolean>(false);
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'yaml'>('yaml');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiffModalOpen, setDiffModalOpen] = useState(false);
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
  const [isCasingModalOpen, setCasingModalOpen] = useState(false);
  const [isSortModalOpen, setSortModalOpen] = useState(false);
  const [isSortComponentsModalOpen, setSortComponentsModalOpen] = useState(false);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isOverlayModalOpen, setOverlayModalOpen] = useState(false);
  const [isInstructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [isRawConfigModalOpen, setRawConfigModalOpen] = useState(false);
  const [filterFormOptions, setFilterFormOptions] = useState<AnalyzeOpenApiResult>({});
  const [selectedOptions, setSelectedOptions] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [components, setComponents] = useState<ComponentMetrics>(defaultCompMetrics);
  const [unusedComponents, setUnusedComponents] = useState<ComponentMetrics>(defaultCompMetrics);
  const [usedActions, setUsedActions] = useState([]);
  const [unusedActions, setUnusedActions] = useState([]);

  const [totalComponents, setTotalComponents] = useState(0);
  const [totalUnusedComponents, setTotalUnusedComponents] = useState(0);
  const [totalTags, setTotalTags] = useState(0);
  const [totalPaths, setTotalPaths] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [totalUsedActions, setTotalUsedActions] = useState(0);
  const [totalUnusedActions, setTotalUnusedActions] = useState(0);

  const [pathSort, setPathSort] = useState<'original' | 'path' | 'tags'>('original');
  const [defaultFieldSorting, setDefaultFieldSorting] = useState<boolean>(true);

  const dInput = useDebounce(input, 1000);
  const dFilterSet = useDebounce(filterSet, 1000);
  const dSortSet = useDebounce(sortSet, 1000);
  const dSortComponentsSet = useDebounce(sortComponentsSet, 1000);
  const dOverlaySet = useDebounce(overlaySet, 1000);
  const dGenerateSet = useDebounce(generateSet, 1000);
  const dCasingSet = useDebounce(casingSet, 1000);

  const config = {
    sort,
    keepComments,
    filterSet,
    sortSet,
    sortComponentsSet,
    casingSet,
    overlaySet,
    generateSet,
    isFilterOptionsCollapsed,
    toggleGenerate,
    toggleCasing,
    toggleOverlay,
    outputLanguage,
    pathSort,
    defaultFieldSorting
  } || {} as PlaygroundConfig;

  const handleInputChange = useCallback(async (newValue: string) => {
    setLoading(true);
    setErrorMessage(null);
    let convertOptions = {keepComments: keepComments || false};
    const oaObj = await parseString(newValue, convertOptions) as OpenAPIV3.Document;
    const oaElements = analyzeOpenApi(oaObj);
    setTotalPaths(oaElements.operations?.length || 0);
    setTotalTags(oaElements.tags?.length || 0);
    setFilterFormOptions(oaElements);
    setInput(newValue);
  }, [setInput]);

  // Handle format conversion
  useEffect(() => {

    const config = {
      sort,
      keepComments: keepComments,
      filterSet: dFilterSet,
      sortSet: dSortSet,
      sortComponentsSet: dSortComponentsSet,
      ...(dOverlaySet && toggleOverlay && {overlaySet: dOverlaySet}),
      ...(dGenerateSet && toggleGenerate && {generateSet: dGenerateSet}),
      ...(dCasingSet && toggleCasing && {casingSet: dCasingSet}),
      format: outputLanguage,
    };

    const handleFormat = async () => {
      try {
        const response = await fetch('/api/format', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            openapi: dInput,
            config
          }),
        });

        const res = await response.json();
        if (response.ok) {
          setOutput(res.data);
          setTotalComponents(res.resultData?.totalComp?.meta?.total || 0);
          setTotalUnusedComponents(res.resultData?.unusedComp?.meta?.total || 0);
          setComponents(res.resultData?.totalComp || defaultCompMetrics);
          setUnusedComponents(res.resultData?.unusedComp || defaultCompMetrics);

          setTotalActions(res.resultData?.totalActions || 0);
          setTotalUsedActions(res.resultData?.totalUsedActions || 0);
          setTotalUnusedActions((res.resultData?.unusedActions?.length || 0));
          setUnusedActions(res.resultData?.unusedActions || []);
          setUsedActions(res.resultData?.usedActions || []);

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
  }, [dInput, sort, keepComments, dFilterSet, dSortSet, dSortComponentsSet, dGenerateSet, dCasingSet, dOverlaySet, outputLanguage, pathSort, toggleGenerate, toggleCasing, toggleOverlay, setOutput, defaultFieldSorting]);

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
          // console.log('decodeUrl config',result?.config);
          setSort(result.config.sort ?? true);
          setKeepComments(result.config.keepComments ?? false);
          setFilterSet(result.config.filterSet ?? '');
          setGenerateSet(result.config.generateSet ?? '');
          setCasingSet(result.config.casingSet ?? '');
          setSortSet(result.config.sortSet ?? '');
          setSortComponentsSet(result.config.sortComponentsSet ?? '');
          setOverlaySet(result.config.overlaySet ?? '');
          setCustomSortSet(result.config.sortSet ?? defaultSortSet);
          setCustomSortComponentsSet(result.config.sortComponentsSet ?? defaultSortComponentsSet);

          setToggleOverlay(result.config.toggleOverlay ?? false);
          setToggleCasing(result.config.toggleCasing ?? false);
          setToggleGenerate(result.config.toggleGenerate ?? false);

          setOutputLanguage(result.config.outputLanguage ?? 'yaml');
          setFilterUnused(result?.config?.filterSet?.includes('unusedComponents') ?? false);

          setFilterOptionsCollapsed(result.config.isFilterOptionsCollapsed ?? false);

          setPathSort(result.config.pathSort ?? 'original');
          setDefaultFieldSorting(result.config.defaultFieldSorting ?? true);
        }
        setLoading(false);
      }
    };

    decodeUrl();
  }, [handleInputChange]);

  // Set default Sort Set
  useEffect(() => {
    const convertSortSet = async () => {
      const result = await stringify(defaultSort, {format: outputLanguage});
      setDefaultSortSet(result);
    };
    const convertSortComponentsSet = async () => {
      const result = await stringify(defaultSortComponents, {format: outputLanguage});
      setDefaultSortComponentsSet(result);
    };
    const convertFilterSet = async () => {
      if (filterSet && filterSet.length > 0) {

        // Check if flagValues is an array and not converted to an object
        // if (Array.isArray(filterObj?.flagValues)) {
        //   filterObj.flagValues = filterObj.flagValues.map(value =>
        //     typeof value === 'string' ? value : Object.keys(value)[0]
        //   );
        // }

        const filterObj = await parseString(filterSet)
        const result = await stringify(filterObj, {format: outputLanguage});
        setFilterSet(result);
      }
    };

    convertSortSet();
    convertSortComponentsSet();
    convertFilterSet();
  }, [outputLanguage, dFilterSet]);

  const toggleFilterUnused = async () => {
    let filterSetObj: OpenAPIFilterSet;
    if (filterSet.trim()) {
      filterSetObj = await parseString(filterSet) as OpenAPIFilterSet;
    } else {
      filterSetObj = {};
    }
    includeUnusedComponents(filterSetObj, !filterUnused);
    let filterSetString = await stringify(filterSetObj, {format: outputLanguage}) as string;
    filterSetString = (filterSetString.trim() === '{}') ? '' : filterSetString;
    setFilterSet(filterSetString);
    setFilterUnused(!filterUnused);
  };

  const togglePreserve = async () => {
    let filterSetObj: OpenAPIFilterSet;
    if (filterSet.trim()) {
      filterSetObj = await parseString(filterSet) as OpenAPIFilterSet;
    } else {
      filterSetObj = {};
    }
    includePreserve(filterSetObj, !filterPrevent);
    let filterSetString = await stringify(filterSetObj, {format: outputLanguage}) as string;
    filterSetString = (filterSetString.trim() === '{}') ? '' : filterSetString;
    setFilterSet(filterSetString);
    setFilterPrevent(!filterPrevent);
  };

  const openDiffModal = () => {
    setDiffModalOpen(true);
  };

  const openGenerateModal = () => {
    setGenerateModalOpen(true);
  };

  const openCasingModal = () => {
    setCasingModalOpen(true);
  };

  const openSortModal = () => {
    setSortModalOpen(true);
  };

  const openSortComponentsModal = () => {
    setSortComponentsModalOpen(true);
  };

  const openFormModal = () => {
    setFormModalOpen(true);
  };

  const openOverlayModal = () => {
    setOverlayModalOpen(true);
  };

  const openInstructionsModal = () => {
    setInstructionsModalOpen(true);
  };

  const openRawConfigModal = () => {
    setRawConfigModalOpen(true);
  };

  const handleFileLoad = async (content: string | null, context: string) => {
    if (context === 'playground') {
      setLoading(true);
      await handleInputChange(content || '');
    }
  };

  const handleFormSubmit = async (selectedOptions: any) => {
    const _selectedOptions = Object.fromEntries(
      Object.entries(selectedOptions).filter(([_, value]) => (value as string[]).length > 0)
    );
    includeUnusedComponents(_selectedOptions, filterUnused);

    let filterFormOptionsString = await stringify(_selectedOptions) || '';
    filterFormOptionsString = filterFormOptionsString.replace(/- '/g, '- ').replace(/'\n/g, '\n');

    setFilterSet(filterFormOptionsString);
    setSelectedOptions(_selectedOptions);
    setFormModalOpen(false);
  };

  const handleGenerateSubmit = async (selectedOptions: any) => {
    const _selectedOptions = await stringify(selectedOptions)
    setGenerateSet(_selectedOptions);
    setGenerateModalOpen(false);
    setToggleGenerate(true);
  };

  const handleCasingSubmit = async (selectedOptions: any) => {
    const _selectedOptions = await stringify(selectedOptions)
    setCasingSet(_selectedOptions);
    setCasingModalOpen(false);
    setToggleCasing(true);
  };

  const handleSortSubmit = async (sortOptions: any) => {
    setCustomSortSet(sortOptions);
    setSortSet(sortOptions);
    setSortModalOpen(false);
  };

  const handleSortComponentsSubmit = async (list: any) => {
    setCustomSortComponentsSet(list);
    setSortComponentsSet(list);
    setSortComponentsModalOpen(false);
  };

  const handleOverlaySubmit = async (overlayOptions: any) => {
    const oaOverlay = await stringify(overlayOptions, {format: outputLanguage});
    setOverlaySet(oaOverlay);
    setSortModalOpen(false);
    setToggleOverlay(true);
  };

  const handleDefaultFieldSortingChange = async () => {
    setDefaultFieldSorting(!defaultFieldSorting);
    if (defaultFieldSorting) {
      let newSortSet = customSortSet;
      // if (sortSet.trim() !== '') {
      //   newSortSet = defaultSortSet
      // }
      setSortSet(newSortSet);
      await handlePathSortChange(pathSort, newSortSet)
    } else {
      let newSortSet = '';
      setSortSet(newSortSet);
      await handlePathSortChange(pathSort, newSortSet)
    }
  };

  const handlePathSortChange = async (newPathSort: 'original' | 'path' | 'tags', sortSetStr?: string) => {
    setPathSort(newPathSort);

    let sortSetObj: OpenAPISortSet = {} as OpenAPISortSet;
    if (sortSetStr && sortSetStr.trim() !== '') {
      sortSetObj = (await parseString(sortSetStr)) as OpenAPISortSet;
    }

    // Original path order
    if (newPathSort === 'original') {
      delete sortSetObj.sortPathsBy
      sortSetStr = await stringify(sortSetObj, {format: outputLanguage});

      if (Object.keys(sortSetObj).length === 0) {
        sortSetStr = ''
      }
      setSortSet(sortSetStr)
    }

    if (newPathSort !== 'original') {
      sortSetObj.sortPathsBy = newPathSort
      const sortSetStr = await stringify(sortSetObj, {format: outputLanguage});
      setSortSet(sortSetStr)
    }
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
            <div className="flex items-center mb-2">
              <h2 className="text-heading text-xl font-bold">Configuration</h2>
              <div className="ml-4">
                <select
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value as 'json' | 'yaml')}
                  className="p-1 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                >
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>
              {/*<button*/}
              {/*  className="ml-2 bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"*/}
              {/*  onClick={(e) => {*/}
              {/*    e.stopPropagation();*/}
              {/*    openRawConfigModal();*/}
              {/*  }}*/}
              {/*>*/}
              {/*  Configure*/}
              {/*</button>*/}
            </div>

            {outputLanguage === 'yaml' && (
              <>
                <div className="mb-2">
                  <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                    Keep comments
                    <input
                      type="checkbox"
                      checked={keepComments}
                      onChange={() => setKeepComments(!keepComments)}
                      className="ml-2"/>
                  </label>
                </div>
              </>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Sort options</h3>
              <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                Sort OpenAPI
                <input
                  type="checkbox"
                  checked={sort}
                  onChange={() => setSort(!sort)}
                  className="ml-2"/>
              </label>
              {sort && (
                <div className="flex items-center mt-2">
                  <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                    Custom OpenAPI field sorting
                    <input
                      type="checkbox"
                      checked={!defaultFieldSorting}
                      onChange={handleDefaultFieldSortingChange}
                      className="ml-2 mr-2"
                    />
                  </label>
                  <button
                    onClick={openSortModal}
                    className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                  >
                    Configure
                  </button>
                </div>
                <div className="flex items-center mt-2">
                  <label className="flex items-center font-medium text-gray-700 dark:text-gray-400 mr-2">
                    Custom components sorting
                  </label>
                  <button
                    onClick={openSortComponentsModal}
                    className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                  >
                    Configure
                  </button>
                </div>
              )}
            </div>
            {sort && (
              <div className="flex items-center mb-4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-400 mr-2">Sort Paths By</label>
                <select
                  value={pathSort}
                  onChange={(e) => handlePathSortChange(e.target.value as 'original' | 'path' | 'tags', sortSet)}
                  className="p-0 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
                >
                  <option value="original">Original order</option>
                  <option value="path">Path</option>
                  <option value="tags">Tag name</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">OpenAPI Overlay</h3>
              <div className="flex items-center">
                <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                  Apply Overlay
                  <input
                    type="checkbox"
                    id="formatOverlay"
                    checked={toggleOverlay}
                    onChange={() => setToggleOverlay(!toggleOverlay)}
                    className="ml-2 mr-2"
                  />
                </label>
                <button
                  onClick={openOverlayModal}
                  className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                >
                  Configure
                </button>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-start">
                <h3
                  className="text-lg font-semibold mb-2 cursor-pointer flex items-center"
                  onClick={() => setFilterOptionsCollapsed(!isFilterOptionsCollapsed)}
                >
                  Filter options {isFilterOptionsCollapsed ? '▲' : '▼'}
                </h3>
                {Object.keys(filterFormOptions).length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFormModal();
                      }}>
                      Configure
                    </button>
                    <ButtonDownload
                      content={filterSet}
                      filename="oaf-filter"
                      format={outputLanguage}
                      label="Download filter"
                      className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
                    />
                  </div>
                )}
              </div>
              {!isFilterOptionsCollapsed && (
                <div>
                  <MonacoEditorWrapper value={filterSet} onChange={setFilterSet} height='36vh'/>
                </div>
              )}
              <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                Filter Unused Components
                <input
                  type="checkbox"
                  checked={filterUnused}
                  onChange={toggleFilterUnused}
                  className="ml-2"
                />
              </label>
              <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                Preserve Empty objects
                <input
                  type="checkbox"
                  checked={filterPrevent}
                  onChange={togglePreserve}
                  className="ml-2"
                />
              </label>
            </div>

            <div className="mb-2">
              <h3 className="text-lg font-semibold mb-2 flex items-center">Extra options</h3>
              <div className="flex items-center mb-2">
                <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">
                  Generate OperationId
                  <input
                    type="checkbox"
                    id="generateOperationId"
                    className="ml-2 mr-2"
                    checked={toggleGenerate}
                    onChange={() => setToggleGenerate(!toggleGenerate)}
                  />
                </label>
                <button
                  onClick={openGenerateModal}
                  className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                >
                  Configure
                </button>
              </div>
              <div className="flex items-center">
                <label className="flex items-center font-medium text-gray-700 dark:text-gray-400">Format casing
                  <input
                    type="checkbox"
                    id="formatCasing"
                    className="ml-2 mr-2"
                    checked={toggleCasing}
                    onChange={() => setToggleCasing(!toggleCasing)}
                  />
                </label>
                <button
                  onClick={openCasingModal}
                  className="bg-blue-500 text-white text-xs p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-heading text-xl font-bold">OpenAPI Input</h2>
              <div className="flex space-x-2">
                <button onClick={openOverlayModal}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-medium text-sm py-1 px-2 rounded">
                  OpenAPI Overlay
                </button>
                <ButtonUrlModal context="playground" onUrlLoad={handleFileLoad}/>
                <ButtonUpload context="playground" onFileLoad={handleFileLoad}/>
              </div>
            </div>
            <MonacoEditorWrapper value={input} onChange={handleInputChange}/>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-heading text-xl font-bold">OpenAPI Output</h2>
              {loading && <LoadingSpinner/>}
              <div className="space-x-2">
                <button onClick={openDiffModal}
                        className="bg-white hover:bg-gray-200 text-green-500 font-medium text-sm py-1 px-2 rounded border border-green-500">
                  Show Diff
                </button>
                <button onClick={openInstructionsModal}
                        className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-2 rounded">
                  CLI instructions
                </button>
                <ButtonShare openapi={input} config={config}/>
                <ButtonDownload content={output} filename="openapi-formatted" format={outputLanguage}/>
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
        totalActions={totalActions}
        totalUsedActions={totalUsedActions}
        totalUnusedActions={totalUnusedActions}
        unusedActions={unusedActions}
        usedActions={usedActions}
      />

      {
        Object.keys(filterFormOptions).length > 0 && (
          <button onClick={openFormModal}
                  className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg">
            Open Filter Form
          </button>
        )
      }

      <FilterFormModal
        isOpen={isFormModalOpen}
        onRequestClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        filterOptions={filterFormOptions}
      />

      <GenerateFormModal
        isOpen={isGenerateModalOpen}
        onRequestClose={() => setGenerateModalOpen(false)}
        onSubmit={handleGenerateSubmit}
        openapi={input}
        generateOptions={generateSet}
      />

      <CasingFormModal
        isOpen={isCasingModalOpen}
        onRequestClose={() => setCasingModalOpen(false)}
        onSubmit={handleCasingSubmit}
        casingOptions={casingSet}
      />

      <SortOptionsModal
        isOpen={isSortModalOpen}
        onRequestClose={() => setSortModalOpen(false)}
        sortSet={customSortSet}
        onSubmit={handleSortSubmit}
        outputLanguage={outputLanguage}
        defaultSort={defaultSortSet}
      />

      <SortComponentsModal
        isOpen={isSortComponentsModalOpen}
        onRequestClose={() => setSortComponentsModalOpen(false)}
        sortComponentsSet={customSortComponentsSet}
        onSubmit={handleSortComponentsSubmit}
        outputLanguage={outputLanguage}
        defaultSortComponents={defaultSortComponentsSet}
      />

      <OverlayModal
        isOpen={isOverlayModalOpen}
        onRequestClose={() => setOverlayModalOpen(false)}
        overlaySet={overlaySet}
        openapi={input}
        onSubmit={handleOverlaySubmit}
        format={outputLanguage}
      />

      <DiffEditorModal
        isOpen={isDiffModalOpen}
        onRequestClose={() => setDiffModalOpen(false)}
        original={input}
        modified={output}
        language={outputLanguage}
      />

      <InstructionsModal
        isOpen={isInstructionsModalOpen}
        onRequestClose={() => setInstructionsModalOpen(false)}
        sort={sort}
        keepComments={keepComments}
        sortSet={sortSet}
        filterSet={filterSet}
        casingSet={casingSet}
        generateSet={generateSet}
        overlaySet={overlaySet}
        toggleCasing={toggleCasing}
        toggleGenerate={toggleGenerate}
        toggleOverlay={toggleOverlay}
        format={outputLanguage}
      />

      <RawConfigModal
        isOpen={isRawConfigModalOpen}
        onRequestClose={() => setRawConfigModalOpen(false)}
        sort={sort}
        keepComments={keepComments}
        sortSet={sortSet}
        filterSet={filterSet}
        format={outputLanguage}
      />
    </div>
  );
};

export default Playground;
