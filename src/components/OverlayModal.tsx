// components/ActionsModal.tsx

import React, { useState, useEffect } from "react";
import SimpleModal from "./SimpleModal";
import MonacoEditorWrapper from "./MonacoEditorWrapper";

import {resolveJsonPathValue, parseString, stringify} from "openapi-format";
import ButtonDownload from "@/components/ButtonDownload";
import ButtonUrlModal from "@/components/ButtonUrlModal";
import ButtonUpload from "@/components/ButtonUpload";
import JsonPathPickerModal from "@/components/JsonPathPickerModal";
import OverlayTemplatesModal from "@/components/OverlayTemplatesModal";
import useSessionStorage from "@/hooks/useSessionStorage";

interface Action {
  target: string;
  type: "update" | "remove" | "add";
  value?: string;
  enabled?: boolean; // UI-only flag; disabled actions are excluded from API overlay
  expanded?: boolean; // UI-only flag; controls expand/collapse state
}

interface ActionsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (overlaySet: any) => void;
  format: 'json' | 'yaml'
  overlaySet: string; // The OpenAPI Overlay document
  openapi: string; // The base OpenAPI document for preview
}

const ActionsModal: React.FC<ActionsModalProps> = ({isOpen, onRequestClose, onSubmit, overlaySet, openapi, format}) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [previewValues, setPreviewValues] = useState<string[]>([]);
  const [matchCounts, setMatchCounts] = useState<number[]>([]);
  const [currentMode, setCurrentMode] = useState<"UI" | "Code">("UI");
  const [overlaySetCode, setOverlaySetCode] = useState<string>("");
  const [info, setInfo] = useState<{ title: string; version: string }>({
    title: "",
    version: "",
  });
  const [extendsRef, setExtendsRef] = useState<string>("");
  const [jsonPathSuggestions, setJsonPathSuggestions] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  const [expandedPersist, setExpandedPersist] = useSessionStorage<boolean[]>("oaf-overlay-expanded", []);

  // Initialize actions from overlaySet when modal opens
  useEffect(() => {
    const initialize = async () => {
      const OverlayOpts = (await parseString(overlaySet)) as Record<string, unknown>;
      const actions = await convertOverlaySetToActions(OverlayOpts, format);
      const exp = (expandedPersist?.length === actions.length)
        ? expandedPersist
        : new Array(actions.length).fill(true);
      setActions(actions.map((a, i) => ({...a, expanded: exp[i]})));
      setExpandedPersist(exp);
      setOverlaySetCode(overlaySet);

      const previews = await computePreviewValues(actions, openapi);
      setPreviewValues(previews);
      const counts = await computeMatchCounts(actions, openapi);
      setMatchCounts(counts);

      // Initialize info object if present
      if (OverlayOpts.info) {
        const info = OverlayOpts.info as { title?: string; version?: string };
        setInfo({
          title: info.title || "",
          version: info.version || "",
        });
      }

      // Initialize extends if present
      if ((OverlayOpts as any)?.extends) {
        setExtendsRef(String((OverlayOpts as any).extends));
      } else {
        setExtendsRef("");
      }
    };

    initialize();
  }, [overlaySet, openapi, format]);

  // Build JSONPath suggestions from the current OpenAPI document
  useEffect(() => {
    const buildSuggestions = async () => {
      try {
        const oa = await parseString(openapi) as any;
        const suggestions = generateJsonPathSuggestions(oa);
        setJsonPathSuggestions(suggestions);
      } catch {
        setJsonPathSuggestions([]);
      }
    };
    buildSuggestions();
  }, [openapi]);

  // Toggle between UI and Code modes
  const toggleMode = async () => {
    if (currentMode === "UI") {
      // Convert actions to overlaySet and update overlaySetCode
      const OverlayOpts = await parseString(overlaySet) as Record<string, unknown>;
      const base = {
        ...OverlayOpts,
        info: {...info},
      } as any;
      if (extendsRef?.trim()) base.extends = extendsRef.trim();
      const updatedOverlaySet = pruneUndefined(await convertActionsToOverlaySet(actions, base));
      const updatedCode = await stringify(updatedOverlaySet, {format});
      setOverlaySetCode(updatedCode);
    } else {
      // Switch to UI Mode: Update actions from overlaySetCode
      try {
        const parsedOverlaySet = await parseString(overlaySetCode) as Record<string, unknown>;
        const updatedActions = await convertOverlaySetToActions(parsedOverlaySet, format);
        setActions(updatedActions);

        const previews = await computePreviewValues(updatedActions, openapi);
        setPreviewValues(previews);
        const counts = await computeMatchCounts(updatedActions, openapi);
        setMatchCounts(counts);

        // Update the info object
        if (parsedOverlaySet?.info) {
          const updatedInfo = parsedOverlaySet.info as { title?: string; version?: string };
          setInfo({
            title: updatedInfo.title || "",
            version: updatedInfo.version || "",
          });
        } else {
          setInfo({title: "", version: ""});
        }

        // Sync extends from code when switching to UI mode
        if ((parsedOverlaySet as any)?.extends) {
          setExtendsRef(String((parsedOverlaySet as any).extends));
        } else {
          setExtendsRef("");
        }
      } catch (error) {
        console.error("Error parsing overlaySet:", error);
        alert("Invalid overlay code. Please fix the overlay config or switch back to UI mode.");
      }
    }

    setCurrentMode((prevMode) => (prevMode === "UI" ? "Code" : "UI"));
  };

  const handleAddAction = (index?: number) => {
    if (index !== undefined) {
      // Insert action at the specified index + 1
      setActions([
        ...actions.slice(0, index + 1),
        { target: "", type: "update", expanded: true },
        ...actions.slice(index + 1),
      ]);
      setPreviewValues([
        ...previewValues.slice(0, index + 1),
        "",
        ...previewValues.slice(index + 1),
      ]);
      setMatchCounts([
        ...matchCounts.slice(0, index + 1),
        0,
        ...matchCounts.slice(index + 1),
      ]);
      setExpandedPersist([
        ...expandedPersist.slice(0, index + 1),
        true,
        ...expandedPersist.slice(index + 1),
      ]);
    } else {
      // Default behavior: Add action at the end
      setActions([...actions, { target: "", type: "update", expanded: true }]);
      setPreviewValues([...previewValues, ""]);
      setMatchCounts([...(matchCounts || []), 0]);
      setExpandedPersist([...(expandedPersist || []), true]);
    }
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    setPreviewValues(previewValues.filter((_, i) => i !== index));
    setMatchCounts(matchCounts.filter((_, i) => i !== index));
    setExpandedPersist(expandedPersist.filter((_, i) => i !== index));
  };

  const handleDuplicateAction = (index: number) => {
    const cloned = { ...actions[index] };
    const clonedPreview = previewValues[index];
    setActions([
      ...actions.slice(0, index + 1),
      cloned,
      ...actions.slice(index + 1),
    ]);
    setPreviewValues([
      ...previewValues.slice(0, index + 1),
      clonedPreview,
      ...previewValues.slice(index + 1),
    ]);
    setMatchCounts([
      ...matchCounts.slice(0, index + 1),
      matchCounts[index] || 0,
      ...matchCounts.slice(index + 1),
    ]);
    setExpandedPersist([
      ...expandedPersist.slice(0, index + 1),
      expandedPersist[index] ?? true,
      ...expandedPersist.slice(index + 1),
    ]);
  };

  const handleActionChange = async (index: number, field: keyof Action, value: string) => {
    const updatedActions = [...actions];
    const updatedPreviews = [...previewValues];

    if (field === "type") {
      // Ensure value is one of "update" | "remove" | "add"
      if (value === "update" || value === "remove" || value === "add") {
        updatedActions[index][field] = value as Action["type"];
      }
    } else if (field === "target" || field === "value") {
      updatedActions[index][field] = value;
    }

    if (field === "target") {
      try {
        const openapiObj = await parseString(openapi) as Record<string, unknown>;
        const resolvedValues = resolveJsonPathValue(openapiObj, value);
        if (resolvedValues.length > 0) {
          updatedPreviews[index] = await stringify(resolvedValues[0]);
          if (!updatedActions[index].value || updatedActions[index].value.trim() === "") {
            updatedActions[index].value = await stringify(resolvedValues[0]);
          }
        } else {
          updatedPreviews[index] = "No matching value found.";
        }
        const newCounts = [...matchCounts];
        newCounts[index] = resolvedValues.length;
        setMatchCounts(newCounts);
      } catch (e) {
        updatedPreviews[index] = "Invalid target or JSONPath.";
        const newCounts = [...matchCounts];
        newCounts[index] = 0;
        setMatchCounts(newCounts);
      }
    }

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
  };

  const handleToggleEnabled = async (index: number) => {
    const updated = [...actions];
    const wasEnabled = updated[index].enabled !== false;
    updated[index].enabled = !wasEnabled;
    setActions(updated);
    // Update preview display for disabled state
    if (!updated[index].enabled) {
      const pv = [...previewValues];
      pv[index] = "Action disabled";
      setPreviewValues(pv);
    } else {
      // Recompute this preview only
      try {
        const openapiObj = await parseString(openapi) as Record<string, unknown>;
        const resolvedValues = resolveJsonPathValue(openapiObj, updated[index].target || "");
        const pv = [...previewValues];
        pv[index] = resolvedValues.length > 0 ? await stringify(resolvedValues[0]) : "No matching value found.";
        setPreviewValues(pv);
      } catch {
        const pv = [...previewValues];
        pv[index] = "Invalid target or JSONPath.";
        setPreviewValues(pv);
      }
    }
  };

  const handleValueChange = (index: number, value: string) => {
    const updatedActions = [...actions];
    updatedActions[index].value = value;
    setActions(updatedActions);
  };

  const handleToggleExpanded = (index: number) => {
    const updated = [...actions];
    const prev = updated[index].expanded !== false; // default true
    updated[index].expanded = !prev;
    setActions(updated);
    const exp = [...expandedPersist];
    exp[index] = updated[index].expanded ?? true;
    setExpandedPersist(exp);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return; // Already at the top
    const updatedActions = [...actions];
    const updatedPreviews = [...previewValues];

    // Swap with the previous item
    [updatedActions[index - 1], updatedActions[index]] = [updatedActions[index], updatedActions[index - 1]];
    [updatedPreviews[index - 1], updatedPreviews[index]] = [updatedPreviews[index], updatedPreviews[index - 1]];
    const updatedCounts = [...matchCounts];
    [updatedCounts[index - 1], updatedCounts[index]] = [updatedCounts[index], updatedCounts[index - 1]];

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
    setMatchCounts(updatedCounts);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return; // Already at the bottom
    const updatedActions = [...actions];
    const updatedPreviews = [...previewValues];

    // Swap with the next item
    [updatedActions[index + 1], updatedActions[index]] = [updatedActions[index], updatedActions[index + 1]];
    [updatedPreviews[index + 1], updatedPreviews[index]] = [updatedPreviews[index], updatedPreviews[index + 1]];
    const updatedCounts = [...matchCounts];
    [updatedCounts[index + 1], updatedCounts[index]] = [updatedCounts[index], updatedCounts[index + 1]];

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
    setMatchCounts(updatedCounts);
  };

  // Template building moved to OverlayTemplatesModal

  const handleInfoChange = (field: keyof typeof info, value: string) => {
    setInfo({ ...info, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prefer the latest edited code when in Code mode; otherwise use prop overlaySet
    const baseOverlayRaw = currentMode === 'Code' ? overlaySetCode : overlaySet;
    const OverlayOpts =  await parseString(baseOverlayRaw) as Record<string, unknown>;
    // In Code mode, respect the info/extends from code; in UI mode, use the stateful editors
    let baseForBuild: any;
    if (currentMode === 'Code') {
      baseForBuild = OverlayOpts;
    } else {
      baseForBuild = { ...OverlayOpts, info: { ...info } };
      if (extendsRef?.trim()) {
        baseForBuild.extends = extendsRef.trim();
      } else {
        delete baseForBuild.extends;
      }
    }

    const updatedOverlaySet = pruneUndefined(await convertActionsToOverlaySet(actions, baseForBuild));
    onSubmit(updatedOverlaySet);
    onRequestClose();
  };

  const handleCodeChange = async (newCode: string) => {
    const parsedOverlaySet = await parseString(newCode) as Record<string, unknown>;
    const updatedActions = await convertOverlaySetToActions(parsedOverlaySet, format);
    setActions(updatedActions);
    // Keep the info state in sync with code edits
    if (parsedOverlaySet?.info) {
      const parsedInfo = parsedOverlaySet.info as { title?: string; version?: string };
      setInfo({ title: parsedInfo.title || "", version: parsedInfo.version || "" });
    }
    // Keep extends in sync with code edits
    if ((parsedOverlaySet as any)?.extends) {
      setExtendsRef(String((parsedOverlaySet as any).extends));
    } else {
      setExtendsRef("");
    }
    setOverlaySetCode(newCode);
    const previews = await computePreviewValues(updatedActions, openapi);
    setPreviewValues(previews);
    const counts = await computeMatchCounts(updatedActions, openapi);
    setMatchCounts(counts);
  };

  // Utility to remove undefined values to avoid YAML dump errors
  function pruneUndefined(value: any): any {
    if (Array.isArray(value)) return value.map(pruneUndefined);
    if (value && typeof value === 'object') {
      const out: any = {};
      Object.entries(value).forEach(([k, v]) => {
        if (v !== undefined) out[k] = pruneUndefined(v);
      });
      return out;
    }
    return value;
  }

  const handleOverlayLoad = async (content: string | null, context: string) => {
    if (context === 'overlay' && content) {
      await handleCodeChange(content);
    }
  };

  return (
    <>
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="98%" height="98%">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Overlay Actions</h2>
        </div>

        {currentMode === "UI" ? (
          <div className="flex-grow">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddAction()}
                  className="bg-indigo-500 text-white px-2 py-1 font-medium text-sm rounded hover:bg-indigo-600"
                >
                  Add Action
                </button>
                <button
                  type="button"
                  onClick={() => { setIsTemplateOpen(true); }}
                  className="bg-gray-200 text-gray-800 px-2 py-1 font-medium text-sm rounded hover:bg-gray-300"
                >
                  Templates
                </button>
                <ButtonUrlModal
                  context="overlay"
                  typeTxt="OpenAPI Overlay"
                  onUrlLoad={(content, context) => {
                    handleOverlayLoad(content, context);
                  }}
                />
                <ButtonUpload
                  context="overlay"
                  onFileLoad={handleOverlayLoad}
                />
              </div>
              <div className="flex items-center gap-2">
                <ButtonDownload
                  content={overlaySet}
                  filename="oaf-overlay"
                  format={format}
                  label="Download Overlay"
                  className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-2 rounded"
                />
                <button
                  type="button"
                  onClick={toggleMode}
                  className="bg-gray-200 text-gray-800 px-2 py-1 font-medium text-sm rounded hover:bg-gray-300"
                >
                  Switch to {currentMode === "UI" ? "Code" : "UI"} Mode
                </button>
              </div>
            </div>

            <div className="border py-2 px-4 rounded bg-gray-50 dark:bg-gray-600 mb-2">
              <h3 className="font-semibold mb-2">Info</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={info.title}
                    onChange={(e) => handleInfoChange("title", e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                    placeholder="Enter title"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Version</label>
                  <input
                    type="text"
                    value={info.version}
                    onChange={(e) => handleInfoChange("version", e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                    placeholder="Enter version"
                  />
                </div>
              </div>
            </div>

            <div className="border py-2 px-4 rounded bg-gray-50 dark:bg-gray-600 mb-2">
              <h3 className="font-semibold mb-2">Extends</h3>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={extendsRef}
                  onChange={(e) => setExtendsRef(e.target.value)}
                  className="flex-1 p-2 border rounded dark:bg-gray-800 dark:text-white"
                  placeholder="https://example.com/openapi.yaml or local path"
                />
              </div>
            </div>

            <div className="space-y-2 overflow-auto">
              {actions.length > 0 ? (
                actions.map((action, index) => (
                  <div key={index} className="border py-2 px-4 rounded bg-gray-50 dark:bg-gray-600 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleToggleExpanded(index)}
                          aria-label={action.expanded === false ? 'Expand action' : 'Collapse action'}
                          title={action.expanded === false ? 'Expand' : 'Collapse'}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          {action.expanded === false ? '▸' : '▾'}
                        </button>
                        <h3 className="font-semibold">Action {index + 1}</h3>
                        {action.expanded === false && (
                          <span
                            className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[50vw]"
                            title={`${action.type || 'update'} → ${action.target || '(no target)'}`}
                          >
                            [{action.type}] {action.target || '(no target)'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center text-xs mr-2">
                          <input
                            type="checkbox"
                            checked={action.enabled !== false}
                            onChange={() => handleToggleEnabled(index)}
                            className="mr-1"
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`h-6 w-6 flex justify-center items-center text-xs rounded ${
                            index === 0 ? "bg-gray-300 text-gray-500" : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === actions.length - 1}
                          className={`h-6 w-6 flex justify-center items-center text-xs rounded ${
                            index === actions.length - 1 ? "bg-gray-300 text-gray-500" : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateAction(index)}
                          aria-label="Duplicate action"
                          title="Duplicate action"
                          className="h-6 w-6 flex justify-center items-center text-xs rounded bg-indigo-500 text-white hover:bg-indigo-600"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M9 7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V7z"/>
                            <path d="M5 9a2 2 0 0 1 2-2h1v7a4 4 0 0 0 4 4h7v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(index)}
                          aria-label="Remove action"
                          title="Remove action"
                          className="h-6 w-6 flex justify-center items-center text-xs rounded bg-red-500 text-white hover:bg-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {action.expanded !== false && (
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium">Target (JSONPath)</label>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              (matchCounts[index] || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {(matchCounts[index] || 0)} { (matchCounts[index] || 0) === 1 ? 'match' : 'matches' }
                            </span>
                          </div>
                          <input
                            type="text"
                            value={action.target}
                            onChange={(e) => handleActionChange(index, "target", e.target.value)}
                            list={`jsonpath-suggestions-${index}`}
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                            placeholder="$.paths['/example']"
                          />
                          <datalist id={`jsonpath-suggestions-${index}`}>
                            {jsonPathSuggestions.slice(0, 500).map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => { setPickerIndex(index); setIsPickerOpen(true); }}
                              className="bg-gray-200 text-gray-800 px-2 py-1 font-medium text-xs rounded hover:bg-gray-300"
                            >
                              Pick target
                            </button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="block text-sm font-medium mb-1">Action Type</label>
                          <select
                            value={action.type}
                            onChange={(e) => handleActionChange(index, "type", e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
                          >
                            <option value="update">Update</option>
                            <option value="remove">Remove</option>
                          </select>
                        </div>
                        {(action.type === "update" || action.type === "add") && (
                          <div className="mb-2">
                            <label className="block text-sm font-medium mb-1">
                              {action.type === "update" ? "Update Value" : "Add Value"}
                            </label>
                            <MonacoEditorWrapper
                              value={action.value || ""}
                              onChange={(value) => handleValueChange(index, value)}
                              height="10vh"
                              language={format}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <label className="block text-sm font-medium mb-1">Target Preview</label>
                          <pre
                            className="p-2 bg-gray-100 border rounded overflow-auto text-xs dark:bg-gray-800 "
                            style={{
                              maxHeight: "150px", // Maximum height for the preview
                              whiteSpace: "pre-wrap", // Wrap text for readability
                              wordBreak: "break-word", // Break long words
                            }}
                          >{action.enabled === false ? 'Action disabled' : previewValues[index]}</pre>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddAction(index)}
                          className="bg-indigo-500 text-white px-2 py-1 font-medium text-sm rounded hover:bg-indigo-600 self-end"
                        >
                          Add Action
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col justify-center items-center pt-72">
                  <h3 className="text-lg font-semibold mb-2">Get started with OpenAPI Overlay</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddAction()}
                      className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
                    >
                      Add Your First Action
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsTemplateOpen(true); }}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Templates
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ButtonUrlModal
                  context="overlay"
                  typeTxt="OpenAPI Overlay"
                  onUrlLoad={(content, context) => {
                    handleOverlayLoad(content, context);
                  }}
                />
                <ButtonUpload
                  context="overlay"
                  onFileLoad={handleOverlayLoad}
                />
              </div>
              <div className="flex items-center gap-2">
                <ButtonDownload
                  content={overlaySet}
                  filename="oaf-overlay"
                  format={format}
                  label="Download Overlay"
                  className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-2 rounded"
                />
                <button
                  type="button"
                  onClick={toggleMode}
                  className="bg-gray-200 text-gray-800 px-2 py-1 font-medium text-sm rounded hover:bg-gray-300"
                >
                  Switch to {currentMode === "Code" ? "UI" : "Code"} Mode
                </button>
              </div>
            </div>

            <MonacoEditorWrapper
              value={overlaySetCode}
              onChange={handleCodeChange}
              language={format}
              height="90%"
            />
          </div>
        )}

        <div className="mt-4 flex justify-end space-x-2">
        <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event from bubbling up
              onRequestClose();
            }}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded"
          >
            Apply Overlay
          </button>
        </div>
      </form>
    </SimpleModal>
    <JsonPathPickerModal
      isOpen={isPickerOpen}
      onRequestClose={() => setIsPickerOpen(false)}
      suggestions={jsonPathSuggestions}
      onPick={(s) => { if (pickerIndex != null) handleActionChange(pickerIndex, 'target', s); }}
    />
    <OverlayTemplatesModal
      isOpen={isTemplateOpen}
      onRequestClose={() => setIsTemplateOpen(false)}
      openapi={openapi}
      format={format}
      onAddActions={async (newActions) => {
        const newPreviews = await computePreviewValues(newActions as any, openapi);
        const newCounts = await computeMatchCounts(newActions as any, openapi);
        setActions([...actions, ...(newActions as any)]);
        setPreviewValues([...previewValues, ...newPreviews]);
        setMatchCounts([...(matchCounts || []), ...newCounts]);
      }}
    />
    </>
  );
};

export const convertOverlaySetToActions = async (
  overlaySet: any,
  format: "json" | "yaml"
): Promise<Action[]> => {
  return Promise.all(
    (overlaySet?.actions || []).map(async (action: any) => ({
      target: action.target,
      type: action.update ? "update" : action.add ? "add" : "remove",
      value: action.update
        ? await stringify(action.update, { format })
        : action.add
          ? await stringify(action.add, { format })
          : undefined,
      enabled: action['x-oaf-enabled'] === false ? false : true,
    }))
  );
};

export const convertActionsToOverlaySet = async (
  actions: Action[],
  baseOverlaySet: any
): Promise<any> => {
  // Keep all actions; annotate disabled ones with vendor key to preserve UI state
  const actionsArray = await Promise.all(
    actions.map(async (action) => {
      const actionObject: any = {target: action.target};

      if (action.type === "update") {
        actionObject.update = await parseValuePreserveScalar(action.value);
      } else if (action.type === "add") {
        actionObject.add = await parseValuePreserveScalar(action.value);
      } else if (action.type === "remove") {
        actionObject.remove = true;
      }

      if (action.enabled === false) {
        actionObject['x-oaf-enabled'] = false;
      }

      return actionObject;
    })
  );

  // Construct the overlay set with properties in the desired order
  const overlaySet = {
    overlay: baseOverlaySet.overlay || "1.0.0",
    info: baseOverlaySet.info || {},
    ...baseOverlaySet,
    actions: actionsArray,
  };

  return overlaySet;
};

export const computePreviewValues = async (
  actions: Action[],
  openapi: string
): Promise<string[]> => {
  return Promise.all(
    actions.map(async (action) => {
      try {
        const openapiObj = await parseString(openapi) as Record<string, unknown>;
        const resolvedValues = resolveJsonPathValue(openapiObj, action.target || "");
        return resolvedValues.length > 0
          ? await stringify(resolvedValues[0])
          : "No matching value found.";
      } catch {
        return "Invalid target or JSONPath.";
      }
    })
  );
};

export const computeMatchCounts = async (
  actions: Action[],
  openapi: string
): Promise<number[]> => {
  return Promise.all(
    actions.map(async (action) => {
      try {
        const openapiObj = await parseString(openapi) as Record<string, unknown>;
        const resolvedValues = resolveJsonPathValue(openapiObj, action.target || "");
        return resolvedValues.length;
      } catch {
        return 0;
      }
    })
  );
};

// Helpers to generate quick JSONPath suggestions from OpenAPI structure
function generateJsonPathSuggestions(oa: any): string[] {
  const out = new Set<string>();
  out.add('$.info');
  out.add('$.info.title');
  out.add('$.servers');
  if (Array.isArray(oa?.servers)) {
    oa.servers.forEach((_: any, i: number) => {
      out.add(`$.servers[${i}]`);
      out.add(`$.servers[${i}].url`);
      out.add(`$.servers[${i}].description`);
      if (oa.servers[i]?.variables && typeof oa.servers[i].variables === 'object') {
        Object.keys(oa.servers[i].variables).forEach((v) => {
          const vKey = escapeJsonPathKey(v);
          out.add(`$.servers[${i}].variables[${vKey}]`);
          out.add(`$.servers[${i}].variables[${vKey}].default`);
          out.add(`$.servers[${i}].variables[${vKey}].enum`);
          out.add(`$.servers[${i}].variables[${vKey}].description`);
        });
      }
    });
  }
  if (oa?.paths && typeof oa.paths === 'object') {
    Object.keys(oa.paths).forEach((p) => {
      const key = escapeJsonPathKey(p);
      const base = `$.paths[${key}]`;
      out.add(base);
      const item = oa.paths[p] || {};
      const methods = ['get','post','put','delete','patch','options','head','trace'];
      methods.forEach((m) => {
        if (item[m]) {
          const mBase = `${base}.${m}`;
          out.add(mBase);
          out.add(`${mBase}.summary`);
          out.add(`${mBase}.operationId`);
          out.add(`${mBase}.tags`);
          out.add(`${mBase}.responses`);
          out.add(`${mBase}.parameters`);
          out.add(`${mBase}.requestBody`);
          // Parameter examples under operations
          if (Array.isArray(item[m].parameters)) {
            item[m].parameters.forEach((_: any, idx: number) => {
              const pBase = `${mBase}.parameters[${idx}]`;
              out.add(pBase);
              out.add(`${pBase}.name`);
              out.add(`${pBase}.in`);
              out.add(`${pBase}.required`);
              out.add(`${pBase}.schema`);
              out.add(`${pBase}.example`);
              out.add(`${pBase}.examples`);
            });
          }
        }
      });
    });
  }
  if (oa?.components && typeof oa.components === 'object') {
    const groups = ['schemas','responses','parameters','examples','requestBodies','headers','securitySchemes','links','callbacks'];
    groups.forEach((g) => {
      if (oa.components[g] && typeof oa.components[g] === 'object') {
        Object.keys(oa.components[g]).forEach((name) => {
          const key = escapeJsonPathKey(name);
          out.add(`$.components.${g}[${key}]`);
          if (g === 'parameters') {
            out.add(`$.components.parameters[${key}].name`);
            out.add(`$.components.parameters[${key}].in`);
            out.add(`$.components.parameters[${key}].required`);
            out.add(`$.components.parameters[${key}].schema`);
            out.add(`$.components.parameters[${key}].example`);
            out.add(`$.components.parameters[${key}].examples`);
          }
          if (g === 'examples') {
            out.add(`$.components.examples[${key}].summary`);
            out.add(`$.components.examples[${key}].value`);
          }
          if (g === 'securitySchemes') {
            out.add(`$.components.securitySchemes[${key}].type`);
            out.add(`$.components.securitySchemes[${key}].scheme`);
            out.add(`$.components.securitySchemes[${key}].bearerFormat`);
            out.add(`$.components.securitySchemes[${key}].flows`);
            out.add(`$.components.securitySchemes[${key}].openIdConnectUrl`);
          }
        });
      }
    });
  }
  if (Array.isArray(oa?.tags)) {
    out.add('$.tags');
    oa.tags.forEach((t: any, i: number) => {
      out.add(`$.tags[${i}]`);
      out.add(`$.tags[${i}].name`);
      out.add(`$.tags[${i}].description`);
    });
  }
  return Array.from(out);
}

function escapeJsonPathKey(key: string): string {
  // Prefer bracket-notation with single quotes, escape any single quotes in key
  return `['${String(key).replace(/'/g, "\\'")}']`;
}

async function parseValuePreserveScalar(value?: string) {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return {};
  const parsed = await parseString(trimmed);
  const isErrorLike = parsed && typeof parsed === 'object' && (
    (parsed as any).name && (parsed as any).message
  );
  // YAML parser in openapi-format returns Error objects for scalars; treat as string
  if (isErrorLike) return trimmed;
  // JSON branch could return primitives, but our parseString YAML branch ensures object or error
  return parsed;
}

export default ActionsModal;
