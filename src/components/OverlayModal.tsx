// components/ActionsModal.tsx

import React, { useState, useEffect } from "react";
import SimpleModal from "./SimpleModal";
import MonacoEditorWrapper from "./MonacoEditorWrapper";

import {resolveJsonPathValue, parseString, stringify} from "openapi-format";
import ButtonDownload from "@/components/ButtonDownload";
import ButtonUrlModal from "@/components/ButtonUrlModal";
import ButtonUpload from "@/components/ButtonUpload";

interface Action {
  target: string;
  type: "update" | "remove" | "add";
  value?: string;
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
  const [currentMode, setCurrentMode] = useState<"UI" | "Code">("UI");
  const [overlaySetCode, setOverlaySetCode] = useState<string>("");

  // Initialize actions from overlaySet when modal opens
  useEffect(() => {
    // console.log('ActionsModal mounted or updated');
    // console.log(`isOpen: ${isOpen}`);
    const initialize = async () => {
      const OverlayOpts =  await parseString(overlaySet) as Record<string, unknown>;
      const actions = await convertOverlaySetToActions(OverlayOpts, format);
      setActions(actions);
      setOverlaySetCode(overlaySet);

      const previews = await computePreviewValues(actions, openapi);
      setPreviewValues(previews);
    };

    initialize();
  }, [overlaySet, openapi, format]);

  // Toggle between UI and Code modes
  const toggleMode = async () => {
    // console.log(`Toggling mode from ${currentMode}`);
    if (currentMode === "UI") {
      // Convert actions to overlaySet and update overlaySetCode
      const OverlayOpts =  await parseString(overlaySet) as Record<string, unknown>;
      const updatedOverlaySet = await convertActionsToOverlaySet(actions, OverlayOpts);
      const updatedCode = await stringify(updatedOverlaySet, { format });
      setOverlaySetCode(updatedCode);
    } else {
      // Switch to UI Mode: Update actions from overlaySetCode
      try {
        const parsedOverlaySet = await parseString(overlaySetCode);
        const updatedActions = await convertOverlaySetToActions(parsedOverlaySet, format);
        setActions(updatedActions);

        const previews = await computePreviewValues(updatedActions, openapi);
        setPreviewValues(previews);
      } catch (error) {
        console.error("Error parsing overlaySet:", error);
        alert("Invalid overlay code. Please fix the overlay config or switch back to UI mode.");
      }
    }

    setCurrentMode((prevMode) => (prevMode === "UI" ? "Code" : "UI"));
  };

  const handleAddAction = () => {
    setActions([...actions, { target: "", type: "update" }]);
    setPreviewValues([...previewValues, ""]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    setPreviewValues(previewValues.filter((_, i) => i !== index));
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
        } else {
          updatedPreviews[index] = "No matching value found.";
        }
      } catch (e) {
        updatedPreviews[index] = "Invalid target or JSONPath.";
      }
    }

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
  };

  const handleValueChange = (index: number, value: string) => {
    const updatedActions = [...actions];
    updatedActions[index].value = value;
    setActions(updatedActions);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return; // Already at the top
    const updatedActions = [...actions];
    const updatedPreviews = [...previewValues];

    // Swap with the previous item
    [updatedActions[index - 1], updatedActions[index]] = [updatedActions[index], updatedActions[index - 1]];
    [updatedPreviews[index - 1], updatedPreviews[index]] = [updatedPreviews[index], updatedPreviews[index - 1]];

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return; // Already at the bottom
    const updatedActions = [...actions];
    const updatedPreviews = [...previewValues];

    // Swap with the next item
    [updatedActions[index + 1], updatedActions[index]] = [updatedActions[index], updatedActions[index + 1]];
    [updatedPreviews[index + 1], updatedPreviews[index]] = [updatedPreviews[index], updatedPreviews[index + 1]];

    setActions(updatedActions);
    setPreviewValues(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const OverlayOpts =  await parseString(overlaySet) as Record<string, unknown>;
    const updatedOverlaySet = await convertActionsToOverlaySet(actions, OverlayOpts);
    onSubmit(updatedOverlaySet);
    onRequestClose();
  };

  const handleCodeChange = async (newCode: string) => {
    const parsedOverlaySet = await parseString(newCode);
    const updatedActions = await convertOverlaySetToActions(parsedOverlaySet, format);
    setActions(updatedActions);
    setOverlaySetCode(newCode);
  };

  const handleOverlayLoad = async (content: string | null, context: string) => {
    if (context === 'overlay' && content) {
      handleCodeChange(content);
    }
  };

  return (
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
                  onClick={handleAddAction}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Add Action
                </button>
              </div>
              <div className="flex items-center gap-2">
                <ButtonDownload
                  content={overlaySet}
                  filename="oaf-overlay"
                  format={format}
                  label="Download Overlay"
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={toggleMode}
                  className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                >
                  Switch to {currentMode === "UI" ? "Code" : "UI"} Mode
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-auto">
              {actions.map((action, index) => (
                <div key={index} className="border p-4 rounded bg-gray-50 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Action {index + 1}</h3>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={`px-2 py-1 rounded ${
                          index === 0 ? "bg-gray-300 text-gray-500" : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === actions.length - 1}
                        className={`px-2 py-1 rounded ${
                          index === actions.length - 1 ? "bg-gray-300 text-gray-500" : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">Target (JSONPath)</label>
                        <input
                          type="text"
                          value={action.target}
                          onChange={(e) => handleActionChange(index, "target", e.target.value)}
                          className="w-full p-2 border rounded"
                          placeholder="$.paths['/example']"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">Action Type</label>
                        <select
                          value={action.type}
                          onChange={(e) => handleActionChange(index, "type", e.target.value)}
                          className="w-full p-2 border rounded"
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

                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Target Preview</label>
                      <pre
                        className="p-2 bg-gray-100 border rounded overflow-auto"
                        style={{
                          maxHeight: "150px", // Maximum height for the preview
                          whiteSpace: "pre-wrap", // Wrap text for readability
                          wordBreak: "break-word", // Break long words
                        }}
                      >{previewValues[index]}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-grow">
            {/* Row of buttons */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ButtonUrlModal
                  context="overlay"
                  typeTxt="OpenAPI Overlay"
                  onUrlLoad={(content, context) => {
                    // console.log(`ButtonUrlModal onUrlLoad called with context: ${context}`);
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
                  className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
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
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Save Overlay
          </button>
        </div>
      </form>
    </SimpleModal>
  );
};

export const convertOverlaySetToActions = async (
  overlaySet: any,
  format: "json" | "yaml"
): Promise<Action[]> => {
  return Promise.all(
    overlaySet?.actions?.map(async (action: any) => ({
      target: action.target,
      type: action.update ? "update" : action.add ? "add" : "remove",
      value: action.update
        ? await stringify(action.update, { format })
        : action.add
          ? await stringify(action.add, { format })
          : undefined,
    })) || []
  );
};

export const convertActionsToOverlaySet = async (
  actions: Action[],
  baseOverlaySet: any
): Promise<any> => {
  const overlaySet = {
    overlay: "1.0.0",
    ...baseOverlaySet,
    actions: await Promise.all(
      actions.map(async (action) => {
        const actionObject: any = { target: action.target };

        if (action.type === "update") {
          actionObject.update = await parseString(action.value || "{}");
        } else if (action.type === "add") {
          actionObject.add = await parseString(action.value || "{}");
        } else if (action.type === "remove") {
          actionObject.remove = true;
        }

        return actionObject;
      })
    ),
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

export default ActionsModal;
