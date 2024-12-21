import React, {useEffect, useState} from "react";
import SimpleModal from "./SimpleModal";
import {OpenAPICasingSet, parseString} from "openapi-format";

interface CasingFormModalProps {
  isOpen: boolean,
  onRequestClose: () => void,
  onSubmit: (casingSet: OpenAPICasingSet) => void,
  casingOptions: string
}

const casingSelect = [
  {label: 'camelCase', value: 'camelCase'},
  {label: 'PascalCase', value: 'PascalCase'},
  {label: 'kebab-case', value: 'kebabCase'},
  {label: 'Train-Case', value: 'TrainCase'},
  {label: 'snake_case', value: 'snakeCase'},
  {label: 'Ada_Case', value: 'AdaCase'},
  {label: 'CONSTANT_CASE', value: 'constantCase'},
  {label: 'COBOL-CASE', value: 'cobolCase'},
  {label: 'Dot.notation', value: 'dotNotation'},
  {label: 'Space case', value: 'spaceCase'},
  {label: 'Capital Case', value: 'capitalCase'},
  {label: 'lower case', value: 'lowerCase'},
  {label: 'UPPER CASE', value: 'upperCase'},
];

const CasingFormModal: React.FC<CasingFormModalProps> = ({isOpen, onRequestClose, onSubmit, casingOptions}) => {
  const [casingSet, setCasingSet] = useState<OpenAPICasingSet>({});

  // Parse casingOptions and set the initial state
  useEffect(() => {
    const parseCasingOptions = async () => {
      try {
        const casingSet = await parseString(casingOptions) as OpenAPICasingSet;
        setCasingSet(casingSet);
      } catch (error) {
        console.error('Error parsing generateOptions:', error);
      }
    };

    if (casingOptions) {
      parseCasingOptions();
    }
  }, [casingOptions]);

  const handleCasingChange = (field: keyof OpenAPICasingSet, value: string) => {
    setCasingSet((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(casingSet);
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="44%" height="94%">
      <h2 className="text-xl font-bold mb-4">Configure Casing Options</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Label and Select in same row using grid */}
          <label className="block font-medium self-center">Operation ID</label>
          <select
            value={casingSet.operationId || ''}
            onChange={(e) => handleCasingChange('operationId', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Properties</label>
          <select
            value={casingSet.properties || ''}
            onChange={(e) => handleCasingChange('properties', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Parameters Query</label>
          <select
            value={casingSet.parametersQuery || ''}
            onChange={(e) => handleCasingChange('parametersQuery', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Parameters Header</label>
          <select
            value={casingSet.parametersHeader || ''}
            onChange={(e) => handleCasingChange('parametersHeader', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Parameters Path</label>
          <select
            value={casingSet.parametersPath || ''}
            onChange={(e) => handleCasingChange('parametersPath', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Examples</label>
          <select
            value={casingSet.componentsExamples || ''}
            onChange={(e) => handleCasingChange('componentsExamples', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Schemas</label>
          <select
            value={casingSet.componentsSchemas || ''}
            onChange={(e) => handleCasingChange('componentsSchemas', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Headers</label>
          <select
            value={casingSet.componentsHeaders || ''}
            onChange={(e) => handleCasingChange('componentsHeaders', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Responses</label>
          <select
            value={casingSet.componentsResponses || ''}
            onChange={(e) => handleCasingChange('componentsResponses', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Request Bodies</label>
          <select
            value={casingSet.componentsRequestBodies || ''}
            onChange={(e) => handleCasingChange('componentsRequestBodies', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Security Schemes</label>
          <select
            value={casingSet.componentsSecuritySchemes || ''}
            onChange={(e) => handleCasingChange('componentsSecuritySchemes', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Parameters Query</label>
          <select
            value={casingSet.componentsParametersQuery || ''}
            onChange={(e) => handleCasingChange('componentsParametersQuery', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Parameters Header</label>
          <select
            value={casingSet.componentsParametersHeader || ''}
            onChange={(e) => handleCasingChange('componentsParametersHeader', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="block font-medium self-center">Components Parameters Path</label>
          <select
            value={casingSet.componentsParametersPath || ''}
            onChange={(e) => handleCasingChange('componentsParametersPath', e.target.value)}
            className="p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            <option value="">None</option>
            {casingSelect.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-500 p-2 rounded">
            Cancel
          </button>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Submit
          </button>
        </div>
      </form>
    </SimpleModal>
  );
};

export default CasingFormModal;
