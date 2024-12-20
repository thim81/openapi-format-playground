import React, {useEffect, useState} from "react";
import SimpleModal from "./SimpleModal";
import {openapiGenerate, OpenAPIGenerateSet, OpenAPIResult, parseString} from "openapi-format";
import {OpenAPIV3} from "openapi-types";

interface GenerateFormModalProps {
  openapi: string;
  generateOptions: string;
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (config: { operationIdTemplate: string; overwriteExisting: boolean }) => void;
}

const placeholderOptions = [
  '<operationId>',
  '<method>',
  '<path>',
  '<pathRef>',
  '<tag>',
  '<tag1>',
  '<tag2>',
  '<tagn>',
  '<pathPart1>',
  '<pathPart2>',
  '<pathPartn>',
];

const GenerateFormModal: React.FC<GenerateFormModalProps> = ({isOpen, onRequestClose, onSubmit, openapi, generateOptions}) => {
  const [operationIdTemplate, setOperationIdTemplate] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [preview, setPreview] = useState<string[]>([]);

  // Parse generateOptions and set the initial state
  useEffect(() => {
    const parseGenerateOptions = async () => {
      try {
        const generateSet = await parseString(generateOptions) as OpenAPIGenerateSet;
        setOperationIdTemplate(generateSet.operationIdTemplate ?? '<method>_<pathPart2>');
        setOverwriteExisting(generateSet.overwriteExisting ?? false);
      } catch (error) {
        console.error('Error parsing generateOptions:', error);
      }
    };

    if (generateOptions) {
      parseGenerateOptions();
    }
  }, [generateOptions]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOperationIdTemplate(e.target.value);
  };

  const handlePlaceholderClick = (placeholder: string) => {
    setOperationIdTemplate((prev) => `${prev}${placeholder}`);
  };

  // Function to replace placeholders with actual values from the OpenAPI operation
  const generatePreview = async (template: string, oa: any) => {
    const oaObj = await parseString(oa) as OpenAPIV3.Document
    const result = await openapiGenerate(oaObj, {
      generateSet: {
        operationIdTemplate: template,
        overwriteExisting: overwriteExisting
      },
    }) as OpenAPIResult;

    const openapi = result.data as OpenAPIV3.Document;
    if (openapi?.paths) {
      // Extract the first 3 operations from the paths object
      const pathKeys = Object.keys(openapi.paths);
      const previewItems: string[] = [];

      for (let i = 0; i < Math.min(3, pathKeys.length); i++) {
        const pathKey = pathKeys[i];
        const pathItem = openapi.paths[pathKey];

        // Iterate over methods to fetch operationIds
        const operations = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
        operations.forEach((method) => {
          if (pathItem && (pathItem as any)[method]) {
            const operation = (pathItem as any)[method];
            if (operation.operationId) {
              previewItems.push(operation.operationId);
            }
          }
        });

        // Stop if we already have 3 items
        if (previewItems.length >= 2) {
          break;
        }
      }

      return previewItems;
    }

    return [];
  };

  // Update preview whenever the template changes
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const newPreview = await generatePreview(operationIdTemplate, openapi);
        setPreview(newPreview);
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    };

    if (openapi) {
      fetchPreview();
    }
  }, [operationIdTemplate, overwriteExisting, openapi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({operationIdTemplate, overwriteExisting});
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="60%" height="56%">
      <h2 className="text-xl font-bold mb-4">Generate OperationId Configuration</h2>
      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div>
          <label className="block font-medium mb-2">OperationId Template</label>
          <input
            type="text"
            value={operationIdTemplate}
            onChange={handleTemplateChange}
            className="p-2 border rounded w-full"
          />
          <div className="mt-2">
            <label className="block font-medium mb-1">Placeholders</label>
            <div className="flex flex-wrap gap-2">
              {placeholderOptions.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => handlePlaceholderClick(placeholder)}
                  className="bg-gray-200 dark:bg-green-900 p-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-green-700"
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block font-medium mb-2">Preview</label>
          <div className="bg-gray-100 p-4 rounded space-y-2">
            {preview.length > 0 ? (
              preview.map((previewItem, index) => (
                <div key={index} className="p-2 bg-white dark:bg-gray-950 rounded shadow">
                  {previewItem}
                </div>
              ))
            ) : (
              <div className="p-2 bg-white rounded shadow">
                No preview available
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="overwrite-existing" className="block font-medium mb-2">Overwrite Existing</label>
          <div className="flex items-center">
            <input
              id="overwrite-existing"
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="overwrite-existing" className="cursor-pointer">Overwrite existing operationIds</label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-500 p-2 rounded">Cancel</button>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Submit</button>
        </div>
      </form>
    </SimpleModal>
  );
};

export default GenerateFormModal;
