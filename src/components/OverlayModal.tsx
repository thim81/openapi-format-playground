import React, { useState, useEffect } from "react";
import SimpleModal from "./SimpleModal";
import MonacoEditorWrapper from "./MonacoEditorWrapper";

import {resolveJsonPathValue, parseString} from "openapi-format";

interface Action {
  target: string;
  type: "update" | "remove" | "add";
  format: 'json' | 'yaml';
  value?: string;
}

interface ActionsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (overlaySet: any) => void;
  format: 'json' | 'yaml'
  overlaySet: any; // The OpenAPI Overlay document
  openapi: string; // The base OpenAPI document for preview
}

const ActionsModal: React.FC<ActionsModalProps> = ({ isOpen, onRequestClose, onSubmit, overlaySet, openapi, format }) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [previewValue, setPreviewValue] = useState<string>("");

  // Initialize actions from overlaySet when modal opens
  useEffect(() => {
    setActions(overlaySet?.actions || []);
  }, [overlaySet]);

  const handleAddAction = () => {
    setActions([...actions, { target: "", type: "update", format }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionChange = async (index: number, field: keyof Action, value: string) => {
    const updatedActions = [...actions];

    if (field === "type") {
      // Ensure value is one of "update" | "remove" | "add"
      if (value === "update" || value === "remove" || value === "add") {
        updatedActions[index][field] = value as Action["type"];
      }
    } else if (field === "target" || field === "value") {
      updatedActions[index][field] = value; // These fields accept a string
    }

    if (field === "target") {
      try {
        const openapiObj = await parseString(openapi); // Parse OpenAPI string into a JSON object
        const resolvedValues = resolveJsonPathValue(openapiObj, value); // Resolve the JSONPath
        if (resolvedValues.length > 0) {
          setPreviewValue(JSON.stringify(resolvedValues[0], null, 2)); // Use the first matching value for preview
        } else {
          setPreviewValue("No matching value found.");
        }
      } catch (e) {
        setPreviewValue("Invalid target or JSONPath.");
      }
    }

    setActions(updatedActions);
  };

  const handleValueChange = (index: number, value: string) => {
    const updatedActions = [...actions];
    updatedActions[index].value = value;
    setActions(updatedActions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update overlaySet with the new actions
    const updatedOverlaySet = {
      ...overlaySet,
      actions,
    };

    onSubmit(updatedOverlaySet);
    onRequestClose();
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="98%" height="98%">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-grow">
          <h2 className="text-xl font-bold mb-4">Manage Overlay Actions</h2>
          <p className="mb-4">
            Modify the overlay actions for the OpenAPI document. You can add, update, or remove actions based on JSONPath
            targets.
          </p>

          <div className="mb-4">
            <button
              type="button"
              onClick={handleAddAction}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Add Action
            </button>
          </div>

          <div className="space-y-4 overflow-auto">
            {actions.map((action, index) => (
              <div key={index} className="border p-4 rounded bg-gray-50 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Action {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
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
                    <option value="add">Add</option>
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
                      language={action.format}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Target Preview</h3>
          <pre className="p-2 bg-gray-100 border rounded max-h-40 overflow-auto">
            {previewValue}
          </pre>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onRequestClose}
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

export default ActionsModal;
