import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/playground/Header';
import ConfigSidebar from '@/components/playground/ConfigSidebar';
import EditorPanel, {
  UploadButton,
  ImportUrlButton,
  DownloadButton,
  DiffButton,
  CopyButton,
  EditorActionButton,
} from '@/components/playground/EditorPanel';
import MetricsBar from '@/components/playground/MetricsBar';
import FilterFormDialog from '@/components/playground/dialogs/FilterFormDialog';
import SortOptionsDialog from '@/components/playground/dialogs/SortOptionsDialog';
import CasingFormDialog from '@/components/playground/dialogs/CasingFormDialog';
import GenerateFormDialog from '@/components/playground/dialogs/GenerateFormDialog';
import InstructionsDialog from '@/components/playground/dialogs/InstructionsDialog';
import DiffEditorDialog from '@/components/playground/dialogs/DiffEditorDialog';
import {
  normalizeOriginalForDiff,
  resolveDiffEditorLanguage,
} from '@/components/playground/dialogs/diffEditorLanguage';
import OverlayDialog from '@/components/playground/dialogs/OverlayDialog';
import {
  detectInputDocumentFormat,
  getInputEditorLanguage,
  normalizeImportedInput,
  type InputDocumentFormat,
} from '@/components/playground/inputDocumentFormat';
import { reformatFilterSet } from '@/components/playground/filterSetFormat';
import { applyPathSortToSortSet } from '@/components/playground/sortSetPathSort';
import { Button } from '@/components/ui/button';
import { Layers, Filter, MessageSquare } from 'lucide-react';
import { ChatPanel } from '@/components/chat';
import { useOpenApiAssistant } from '@/components/chat/openapiAssistant';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  processOpenApi,
  analyzeOpenApi,
  parseString,
  stringify,
  defaultCompMetrics,
  type ComponentMetrics,
  type AnalyzeOpenApiResult,
} from '@/lib/openapi-processor';
import {
  generateShareUrl,
  decodeShareUrl,
  includeUnusedComponents,
  includePreserve,
  type PlaygroundConfig,
  type DecodedShareUrl,
} from '@/lib/share';
import useDebounce from '@/hooks/useDebounce';
import defaultSortJson from '@/defaults/defaultSort.json';
import type { OpenAPIV3 } from 'openapi-types';
import type { OpenAPIFilterSet, OpenAPISortSet } from 'openapi-format';
import { toast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const defaultInput = ``;

type DetectedOpenAPIVersion = '3.0' | '3.1' | '3.2' | 'unknown';
type ConvertibleOpenAPIVersion = '3.1' | '3.2';

const detectOpenApiVersion = (doc: any): DetectedOpenAPIVersion => {
  const version = typeof doc?.openapi === 'string' ? doc.openapi.trim() : '';
  if (version.startsWith('3.0')) return '3.0';
  if (version.startsWith('3.1')) return '3.1';
  if (version.startsWith('3.2')) return '3.2';
  return 'unknown';
};

const getConvertibleTargets = (version: DetectedOpenAPIVersion): ConvertibleOpenAPIVersion[] => {
  if (version === '3.0') return ['3.1', '3.2'];
  if (version === '3.1') return ['3.2'];
  return [];
};

const pruneUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => pruneUndefined(item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val !== undefined) out[key] = pruneUndefined(val);
    });
    return out;
  }
  return value;
};

const Index = () => {
  const showAssistant = import.meta.env.DEV;
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState('');
  const [sort, setSort] = useState(true);
  const [keepComments, setKeepComments] = useState(false);
  const [toggleFilter, setToggleFilter] = useState(true);
  const [filterUnused, setFilterUnused] = useState(false);
  const [filterPrevent, setFilterPrevent] = useState(false);
  const [filterSet, setFilterSet] = useState('');
  const [generateSet, setGenerateSet] = useState('');
  const [toggleGenerate, setToggleGenerate] = useState(false);
  const [casingSet, setCasingSet] = useState('');
  const [toggleCasing, setToggleCasing] = useState(false);
  const [toggleOverlay, setToggleOverlay] = useState(false);
  const [defaultSortSet, setDefaultSortSet] = useState('');
  const [customSortSet, setCustomSortSet] = useState('');
  const [sortSet, setSortSet] = useState('');
  const [overlaySet, setOverlaySet] = useState('');
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'yaml'>('yaml');
  const [inputDocumentFormat, setInputDocumentFormat] = useState<InputDocumentFormat>('yaml');
  const [diffOriginal, setDiffOriginal] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [filterFormOptions, setFilterFormOptions] = useState<AnalyzeOpenApiResult>({});
  const [components, setComponents] = useState<ComponentMetrics>(defaultCompMetrics);
  const [unusedComponents, setUnusedComponents] = useState<ComponentMetrics>(defaultCompMetrics);
  const [totalComponents, setTotalComponents] = useState(0);
  const [totalUnusedComponents, setTotalUnusedComponents] = useState(0);
  const [totalTags, setTotalTags] = useState(0);
  const [totalPaths, setTotalPaths] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [totalUsedActions, setTotalUsedActions] = useState(0);
  const [totalUnusedActions, setTotalUnusedActions] = useState(0);
  const [usedActions, setUsedActions] = useState<any[]>([]);
  const [unusedActions, setUnusedActions] = useState<any[]>([]);

  const [pathSort, setPathSort] = useState<'original' | 'path' | 'tags'>('original');
  const [defaultFieldSorting, setDefaultFieldSorting] = useState(true);
  const [inputVersion, setInputVersion] = useState<DetectedOpenAPIVersion>('unknown');
  const [convertVersion, setConvertVersion] = useState<ConvertibleOpenAPIVersion | ''>('');
  const prevOutputLanguageRef = useRef<'json' | 'yaml'>(outputLanguage);
  const processRunIdRef = useRef(0);

  // Dialogs
  const [isDiffOpen, setDiffOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [isSortOpen, setSortOpen] = useState(false);
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [isCasingOpen, setCasingOpen] = useState(false);
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [isInstructionsOpen, setInstructionsOpen] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);

  const dInput = useDebounce(input, 800);
  const dFilterSet = useDebounce(filterSet, 800);
  const dSortSet = useDebounce(sortSet, 800);
  const dOverlaySet = useDebounce(overlaySet, 800);
  const dGenerateSet = useDebounce(generateSet, 800);
  const dCasingSet = useDebounce(casingSet, 800);

  const convertibleTargets = useMemo(() => getConvertibleTargets(inputVersion), [inputVersion]);

  // Analyze input on change
  const applyInputValue = useCallback(async (newValue: string, normalizeImported = false) => {
    let nextValue = newValue;
    let detectedFormat = await detectInputDocumentFormat(newValue);

    if (normalizeImported) {
      const normalized = await normalizeImportedInput(newValue);
      nextValue = normalized.text;
      detectedFormat = normalized.format;
    }

    setInput(nextValue);
    setInputDocumentFormat(detectedFormat === 'unknown' ? 'yaml' : detectedFormat);
    try {
      const oaObj = (await parseString(nextValue)) as unknown as OpenAPIV3.Document;
      const detectedVersion = detectOpenApiVersion(oaObj);
      setInputVersion(detectedVersion);
      const validTargets = getConvertibleTargets(detectedVersion);
      setConvertVersion((current) =>
        current && validTargets.includes(current as any) ? current : '',
      );
      const oaElements = analyzeOpenApi(oaObj as any);
      setTotalPaths(oaElements.operations?.length || 0);
      setTotalTags(oaElements.tags?.length || 0);
      setFilterFormOptions(oaElements);
    } catch {
      setInputVersion('unknown');
      setConvertVersion('');
    }
  }, []);

  const handleInputChange = useCallback(async (newValue: string) => {
    await applyInputValue(newValue, false);
  }, [applyInputValue]);

  const handleImportedInput = useCallback(async (newValue: string) => {
    await applyInputValue(newValue, true);
  }, [applyInputValue]);

  const {
    messages: chatMessages,
    isThinking: chatThinking,
    sendMessage,
    clearMessages,
    quickActions: chatQuickActions,
  } = useOpenApiAssistant({
    specContent: input,
    onSpecReplace: handleInputChange,
  });

  // Process
  useEffect(() => {
    const run = async () => {
      const runId = ++processRunIdRef.current;
      if (!dInput) {
        if (runId === processRunIdRef.current) setOutput('');
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        let effectiveFilterSet = '';
        if (toggleFilter) {
          let effectiveFilterObj: any = {};
          if (dFilterSet && dFilterSet.trim().length > 0) {
            effectiveFilterObj = await parseString(dFilterSet);
            if (
              !effectiveFilterObj ||
              typeof effectiveFilterObj !== 'object' ||
              Array.isArray(effectiveFilterObj) ||
              effectiveFilterObj instanceof Error
            ) {
              effectiveFilterObj = {};
            }
          }
          includeUnusedComponents(effectiveFilterObj, filterUnused);
          includePreserve(effectiveFilterObj, filterPrevent);
          const serializedFilter = (await stringify(effectiveFilterObj as any, {
            format: outputLanguage,
          })) as string;
          effectiveFilterSet = serializedFilter.trim() === '{}' ? '' : serializedFilter;
        }

        const result = await processOpenApi(dInput, {
          sort,
          keepComments,
          filterSet: effectiveFilterSet,
          sortSet: dSortSet,
          overlaySet: toggleOverlay ? dOverlaySet : '',
          generateSet: toggleGenerate ? dGenerateSet : '',
          casingSet: toggleCasing ? dCasingSet : '',
          toggleGenerate,
          toggleCasing,
          toggleOverlay,
          outputLanguage,
          convertVersion,
        });
        if (runId !== processRunIdRef.current) return;
        setOutput(result.output);
        setTotalComponents(result.totalComponents);
        setTotalUnusedComponents(result.totalUnusedComponents);
        setComponents(result.components);
        setUnusedComponents(result.unusedComponents);
        setTotalActions(result.totalActions);
        setTotalUsedActions(result.totalUsedActions);
        setTotalUnusedActions(result.totalUnusedActions);
        setUsedActions(result.usedActions);
        setUnusedActions(result.unusedActions);
      } catch (err: any) {
        if (runId !== processRunIdRef.current) return;
        setErrorMessage(err?.message || 'Processing error');
      }
      if (runId === processRunIdRef.current) setLoading(false);
    };
    run();
  }, [
    dInput,
    sort,
    keepComments,
    dFilterSet,
    dSortSet,
    dGenerateSet,
    dCasingSet,
    dOverlaySet,
    outputLanguage,
    toggleFilter,
    filterUnused,
    filterPrevent,
    toggleGenerate,
    toggleCasing,
    toggleOverlay,
    convertVersion,
  ]);

  useEffect(() => {
    let cancelled = false;

    const syncDiffOriginal = async () => {
      const normalized = await normalizeOriginalForDiff(input, outputLanguage);
      if (!cancelled) setDiffOriginal(normalized);
    };

    void syncDiffOriginal();
    return () => {
      cancelled = true;
    };
  }, [input, outputLanguage]);

  // Set default sort
  useEffect(() => {
    const convert = async () => {
      const result = await stringify(defaultSortJson as any, { format: outputLanguage });
      setDefaultSortSet(result as string);
    };
    convert();
  }, [outputLanguage]);

  // Keep filter set syntax aligned with output language when switching JSON/YAML
  useEffect(() => {
    if (prevOutputLanguageRef.current === outputLanguage) return;
    prevOutputLanguageRef.current = outputLanguage;
    const syncFilterSet = async () => {
      try {
        const reformatted = await reformatFilterSet(filterSet, outputLanguage);
        if (reformatted !== filterSet) setFilterSet(reformatted);
      } catch {
        // Keep existing filter text if it cannot be parsed during a format switch.
      }
    };
    void syncFilterSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputLanguage]);

  // Keep filter toggles aligned with the current filterSet text.
  // If users already have `unusedComponents` in the editor, toggles should reflect/apply it.
  useEffect(() => {
    let cancelled = false;
    const syncFilterFlagsFromContent = async () => {
      const raw = filterSet?.trim();
      if (!raw) {
        if (!cancelled) {
          if (filterUnused) setFilterUnused(false);
          if (filterPrevent) setFilterPrevent(false);
        }
        return;
      }
      try {
        const parsed = await parseString(raw);
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed) ||
          parsed instanceof Error
        )
          return;
        const obj = parsed as any;
        const hasUnused = Array.isArray(obj.unusedComponents) && obj.unusedComponents.length > 0;
        const hasPreserve = obj.preserveEmptyObjects === true;
        if (!cancelled) {
          if (filterUnused !== hasUnused) setFilterUnused(hasUnused);
          if (filterPrevent !== hasPreserve) setFilterPrevent(hasPreserve);
        }
      } catch {
        // Ignore invalid intermediate edits.
      }
    };

    void syncFilterFlagsFromContent();
    return () => {
      cancelled = true;
    };
  }, [filterSet, filterUnused, filterPrevent]);

  // Analyze initial input + decode share URL
  useEffect(() => {
    const init = async () => {
      try {
        const url = window.location.href;
        const result = await decodeShareUrl(url);
        if (result?.openapi) {
          await handleInputChange(result.openapi);
        } else {
          // Analyze default input on mount
          await handleInputChange(input);
        }
        if (result?.config) {
          const c = result.config;
          setSort(c.sort ?? true);
          setKeepComments(c.keepComments ?? false);
          setFilterSet(c.filterSet ?? '');
          setToggleFilter(c.toggleFilter ?? true);
          setGenerateSet(c.generateSet ?? '');
          setCasingSet(c.casingSet ?? '');
          setSortSet(c.sortSet ?? '');
          setOverlaySet(c.overlaySet ?? '');
          setToggleOverlay(c.toggleOverlay ?? false);
          setToggleCasing(c.toggleCasing ?? false);
          setToggleGenerate(c.toggleGenerate ?? false);
          setOutputLanguage(c.outputLanguage ?? 'yaml');
          setConvertVersion((c.convertVersion as ConvertibleOpenAPIVersion) ?? '');
          setPathSort(c.pathSort ?? 'original');
          setDefaultFieldSorting(c.defaultFieldSorting ?? true);
        }
      } catch {}
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFilterUnused = async () => {
    let filterSetObj: any;
    if (filterSet.trim()) {
      filterSetObj = await parseString(filterSet);
    } else {
      filterSetObj = {};
    }
    includeUnusedComponents(filterSetObj, !filterUnused);
    let str = (await stringify(filterSetObj as any, { format: outputLanguage })) as string;
    str = str.trim() === '{}' ? '' : str;
    setFilterSet(str);
    setFilterUnused(!filterUnused);
  };

  const togglePreserve = async () => {
    let filterSetObj: any;
    if (filterSet.trim()) {
      filterSetObj = await parseString(filterSet);
    } else {
      filterSetObj = {};
    }
    includePreserve(filterSetObj, !filterPrevent);
    let str = (await stringify(filterSetObj as any, { format: outputLanguage })) as string;
    str = str.trim() === '{}' ? '' : str;
    setFilterSet(str);
    setFilterPrevent(!filterPrevent);
  };

  const handleDefaultFieldSortingChange = async () => {
    setDefaultFieldSorting(!defaultFieldSorting);
    if (defaultFieldSorting) {
      setSortSet(customSortSet);
      await handlePathSortChange(pathSort, customSortSet);
    } else {
      setSortSet('');
      await handlePathSortChange(pathSort, '');
    }
  };

  const handlePathSortChange = async (
    newPathSort: 'original' | 'path' | 'tags',
    sortSetStr?: string,
  ) => {
    setPathSort(newPathSort);
    const sourceSortSet = typeof sortSetStr === 'string' ? sortSetStr : sortSet;
    const result = await applyPathSortToSortSet(sourceSortSet, newPathSort, outputLanguage);
    setSortSet(result.sortSet);
    if (result.recoveredFromInvalidInput) {
      toast({
        title: 'Sort options recovered',
        description:
          'Existing sort configuration was invalid; applied path sorting with safe defaults.',
      });
    }
  };

  const handleFilterFormSubmit = async (selectedOptions: Record<string, string[]>) => {
    const filtered = Object.fromEntries(
      Object.entries(selectedOptions).filter(([, v]) => v.length > 0),
    );
    includeUnusedComponents(filtered, filterUnused);
    let str = (await stringify(filtered as any, { format: outputLanguage })) as string;
    str = str.replace(/- '/g, '- ').replace(/'\n/g, '\n');
    setFilterSet(str);
    setFilterOpen(false);
  };

  const handleGenerateSubmit = async (selectedOptions: any) => {
    const str = (await stringify(selectedOptions as any)) as string;
    setGenerateSet(str);
    setToggleGenerate(true);
  };

  const handleCasingSubmit = async (selectedOptions: any) => {
    const str = (await stringify(selectedOptions as any)) as string;
    setCasingSet(str);
    setToggleCasing(true);
  };

  const handleOverlaySubmit = async (overlayOptions: any) => {
    try {
      if (
        overlayOptions instanceof Error ||
        !overlayOptions ||
        typeof overlayOptions !== 'object'
      ) {
        throw new Error('Invalid overlay configuration');
      }
      const sanitized = pruneUndefined(overlayOptions);
      const oaOverlay = (await stringify(sanitized as any, { format: outputLanguage })) as string;
      setOverlaySet(oaOverlay);
      setToggleOverlay(true);
    } catch (err: any) {
      toast({
        title: 'Overlay not applied',
        description: err?.message || 'Invalid overlay configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    const config: PlaygroundConfig = {
      sort,
      keepComments,
      filterSet,
      sortSet,
      overlaySet,
      generateSet,
      casingSet,
      toggleGenerate,
      toggleCasing,
      toggleOverlay,
      toggleFilter,
      outputLanguage,
      convertVersion: convertVersion || undefined,
      pathSort,
      defaultFieldSorting,
    };
    const url = await generateShareUrl(window.location.origin, input, config);
    await navigator.clipboard.writeText(url);
    toast({ title: 'Share URL copied to clipboard!' });
  };

  const handleDownloadFilter = () => {
    const blob = new Blob([filterSet], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oaf-filter.${outputLanguage}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='flex flex-col h-screen bg-background'>
      <Header
        outputLanguage={outputLanguage}
        onOutputLanguageChange={setOutputLanguage}
        inputVersion={inputVersion}
        convertVersion={convertVersion}
        convertibleTargets={convertibleTargets}
        onConvertVersionChange={(v) =>
          setConvertVersion(v.startsWith('v') ? '' : (v as ConvertibleOpenAPIVersion))
        }
        onOpenInstructions={() => setInstructionsOpen(true)}
        onShare={handleShare}
        isProcessing={loading}
      />

      {errorMessage && (
        <div className='px-4 py-1.5 bg-destructive/10 text-destructive text-xs border-b'>
          {errorMessage}
        </div>
      )}

      <div className='flex-1 flex min-h-0'>
        <ConfigSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          sort={sort}
          onSortChange={setSort}
          defaultFieldSorting={defaultFieldSorting}
          onDefaultFieldSortingChange={handleDefaultFieldSortingChange}
          pathSort={pathSort}
          onPathSortChange={(v) => handlePathSortChange(v, sortSet)}
          onOpenSortModal={() => setSortOpen(true)}
          keepComments={keepComments}
          onKeepCommentsChange={setKeepComments}
          outputLanguage={outputLanguage}
          toggleOverlay={toggleOverlay}
          onToggleOverlay={setToggleOverlay}
          onOpenOverlayModal={() => setOverlayOpen(true)}
          toggleFilter={toggleFilter}
          onToggleFilter={setToggleFilter}
          filterSet={filterSet}
          onFilterSetChange={setFilterSet}
          filterUnused={filterUnused}
          onToggleFilterUnused={toggleFilterUnused}
          filterPrevent={filterPrevent}
          onTogglePreserve={togglePreserve}
          onOpenFilterForm={() => setFilterOpen(true)}
          hasFilterFormOptions={Object.keys(filterFormOptions).length > 0}
          onDownloadFilter={handleDownloadFilter}
          toggleGenerate={toggleGenerate}
          onToggleGenerate={setToggleGenerate}
          onOpenGenerateModal={() => setGenerateOpen(true)}
          toggleCasing={toggleCasing}
          onToggleCasing={setToggleCasing}
          onOpenCasingModal={() => setCasingOpen(true)}
        />

        <ResizablePanelGroup direction='horizontal' className='flex-1'>
          <ResizablePanel defaultSize={50} minSize={25}>
            <EditorPanel
              title='OpenAPI Input'
              value={input}
              onChange={handleInputChange}
              language={getInputEditorLanguage(inputDocumentFormat)}
              showPreviewToggle
              actions={
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <EditorActionButton
                        icon={<Layers className='h-3 w-3' />}
                        label='OpenAPI Overlay'
                        onClick={() => setOverlayOpen(true)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>OpenAPI Overlay</TooltipContent>
                  </Tooltip>
                  <ImportUrlButton onUrlLoad={handleImportedInput} />
                  <UploadButton onFileLoad={handleImportedInput} />
                </>
              }
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={25}>
            <EditorPanel
              title='OpenAPI Output'
              value={output}
              onChange={setOutput}
              language={outputLanguage}
              loading={loading}
              showPreviewToggle
              actions={
                <>
                  <DiffButton onClick={() => setDiffOpen(true)} />
                  <CopyButton content={output} />
                  <DownloadButton
                    content={output}
                    filename='openapi-formatted'
                    format={outputLanguage}
                  />
                </>
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
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
        usedActions={usedActions}
        unusedActions={unusedActions}
      />

      {/* FAB for filter */}
      {Object.keys(filterFormOptions).length > 0 && (
        <Button
          className='fixed bottom-12 right-4 h-10 w-10 rounded-full shadow-lg'
          size='icon'
          onClick={() => setFilterOpen(true)}
        >
          <Filter className='h-4 w-4' />
        </Button>
      )}

      {showAssistant && (
        <>
          {/* FAB for AI chat */}
          <Button
            className='fixed bottom-24 right-4 h-11 w-11 rounded-full shadow-lg bg-primary hover:bg-primary/90'
            size='icon'
            onClick={() => setChatOpen(!isChatOpen)}
          >
            <MessageSquare className='h-4.5 w-4.5' />
          </Button>

          {/* AI Chat Panel */}
          <ChatPanel
            open={isChatOpen}
            onClose={() => setChatOpen(false)}
            messages={chatMessages}
            isThinking={chatThinking}
            onSend={sendMessage}
            onClear={clearMessages}
            title='API Assistant'
            subtitle='MCP-powered · OpenAPI helper'
            quickActions={chatQuickActions}
          />
        </>
      )}

      {/* Dialogs */}
      <FilterFormDialog
        isOpen={isFilterOpen}
        onClose={() => setFilterOpen(false)}
        onSubmit={handleFilterFormSubmit}
        filterOptions={filterFormOptions}
      />
      <SortOptionsDialog
        isOpen={isSortOpen}
        onClose={() => setSortOpen(false)}
        sortSet={customSortSet}
        onSubmit={(v) => {
          setCustomSortSet(v);
          setSortSet(v);
        }}
        outputLanguage={outputLanguage}
        defaultSort={defaultSortSet}
      />
      <GenerateFormDialog
        isOpen={isGenerateOpen}
        onClose={() => setGenerateOpen(false)}
        onSubmit={handleGenerateSubmit}
        openapi={input}
        generateOptions={generateSet}
      />
      <CasingFormDialog
        isOpen={isCasingOpen}
        onClose={() => setCasingOpen(false)}
        onSubmit={handleCasingSubmit}
        casingOptions={casingSet}
      />
      <OverlayDialog
        isOpen={isOverlayOpen}
        onClose={() => setOverlayOpen(false)}
        overlaySet={overlaySet}
        openapi={input}
        onSubmit={handleOverlaySubmit}
        format={outputLanguage}
      />
      <DiffEditorDialog
        isOpen={isDiffOpen}
        onClose={() => setDiffOpen(false)}
        original={diffOriginal}
        modified={output}
        language={resolveDiffEditorLanguage(outputLanguage)}
      />
      <InstructionsDialog
        isOpen={isInstructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        sort={sort}
        keepComments={keepComments}
        toggleFilter={toggleFilter}
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
    </div>
  );
};

export default Index;
