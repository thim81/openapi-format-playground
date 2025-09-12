import React, { useState } from 'react';
import SimpleModal from './SimpleModal';
import { parseString, stringify } from 'openapi-format';

export type TemplateAction = {
  target: string;
  type: 'update' | 'remove' | 'add';
  value?: string;
  enabled?: boolean;
};

interface OverlayTemplatesModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onAddActions: (actions: TemplateAction[]) => void;
  openapi: string;
  format: 'json' | 'yaml';
}

const OverlayTemplatesModal: React.FC<OverlayTemplatesModalProps> = ({ isOpen, onRequestClose, onAddActions, openapi }) => {
  const [templateType, setTemplateType] = useState<null | 'addServer' | 'renameTag' | 'setDefaultHeader' | 'deprecateByTag' | 'movePath'>(null);

  // Template form fields
  const [tplUrl, setTplUrl] = useState('');
  const [tplUrlDesc, setTplUrlDesc] = useState('');
  const [tplFromTag, setTplFromTag] = useState('');
  const [tplToTag, setTplToTag] = useState('');
  const [tplHeaderName, setTplHeaderName] = useState('');
  const [tplHeaderDesc, setTplHeaderDesc] = useState('');
  const [tplHeaderType, setTplHeaderType] = useState('string');
  const [tplHeaderStatus, setTplHeaderStatus] = useState('');
  const [tplFromPath, setTplFromPath] = useState('');
  const [tplToPath, setTplToPath] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newActions: TemplateAction[] = [];

    if (templateType === 'addServer') {
      if (!tplUrl.trim()) return;
      const obj: any = { servers: [ { url: tplUrl.trim() } ] };
      if (tplUrlDesc.trim()) obj.servers[0].description = tplUrlDesc.trim();
      const val = await stringify(obj);
      newActions.push({ target: '$', type: 'update', value: val, enabled: true });
    }
    if (templateType === 'renameTag') {
      if (!tplFromTag.trim() || !tplToTag.trim()) return;
      const target = `$..tags[?@=='${tplFromTag.trim()}']`;
      const val = await stringify(tplToTag.trim());
      newActions.push({ target, type: 'update', value: val, enabled: true });
    }
    if (templateType === 'setDefaultHeader') {
      if (!tplHeaderName.trim()) return;
      const status = tplHeaderStatus.trim() || 'default';
      const target = `$..responses['${status}'].headers`;
      const header: any = {};
      header[tplHeaderName.trim()] = {
        ...(tplHeaderDesc.trim() ? { description: tplHeaderDesc.trim() } : {}),
        schema: { type: tplHeaderType || 'string' }
      };
      const val = await stringify(header);
      newActions.push({ target, type: 'update', value: val, enabled: true });
    }
    if (templateType === 'deprecateByTag') {
      if (!tplFromTag.trim()) return;
      const target = `$..[?(@.tags && @.tags.indexOf('${tplFromTag.trim()}')>-1)]`;
      const val = await stringify({ deprecated: true });
      newActions.push({ target, type: 'update', value: val, enabled: true });
    }
    if (templateType === 'movePath') {
      if (!tplFromPath.trim() || !tplToPath.trim()) return;
      try {
        const oa = await parseString(openapi) as any;
        const from = tplFromPath.trim();
        const to = tplToPath.trim();
        const pathItem = oa?.paths?.[from];
        if (!pathItem) {
          alert(`Path not found in base document: ${from}`);
          return;
        }
        const updateObj: any = { paths: {} };
        updateObj.paths[to] = pathItem;
        const val = await stringify(updateObj);
        newActions.push({ target: '$', type: 'update', value: val, enabled: true });
        const removeTarget = `$.paths${escapeJsonPathKey(from)}`;
        newActions.push({ target: removeTarget, type: 'remove', enabled: true });
      } catch (e) {
        alert('Failed to build move/rename action. Ensure the base OpenAPI is loaded.');
        return;
      }
    }

    if (newActions.length > 0) {
      onAddActions(newActions);
      onRequestClose();
    }
  };

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="60%" height="80%" zIndex={60}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Add Action from Template</h3>
      </div>
      {!templateType ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-gray-200 dark:bg-gray-800 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-left" onClick={() => setTemplateType('addServer')}>
            Add Server URL
          </button>
          <button className="bg-gray-200 dark:bg-gray-800 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-left" onClick={() => setTemplateType('renameTag')}>
            Rename Tag
          </button>
          <button className="bg-gray-200 dark:bg-gray-800 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-left" onClick={() => setTemplateType('setDefaultHeader')}>
            Set Default Response Header
          </button>
          <button className="bg-gray-200 dark:bg-gray-800 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-left" onClick={() => setTemplateType('deprecateByTag')}>
            Deprecate Operations with Tag
          </button>
          <button className="bg-gray-200 dark:bg-gray-800 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-left" onClick={() => setTemplateType('movePath')}>
            Move/Rename Path
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {templateType === 'addServer' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Server URL</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplUrl} onChange={e => setTplUrl(e.target.value)} required/>
              <label className="block text-sm font-medium">Description (optional)</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplUrlDesc} onChange={e => setTplUrlDesc(e.target.value)}/>
            </div>
          )}
          {templateType === 'renameTag' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">From Tag</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplFromTag} onChange={e => setTplFromTag(e.target.value)} required/>
              <label className="block text-sm font-medium">To Tag</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplToTag} onChange={e => setTplToTag(e.target.value)} required/>
            </div>
          )}
          {templateType === 'setDefaultHeader' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Header Name</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplHeaderName} onChange={e => setTplHeaderName(e.target.value)} required/>
              <label className="block text-sm font-medium">Header Description (optional)</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplHeaderDesc} onChange={e => setTplHeaderDesc(e.target.value)}/>
              <label className="block text-sm font-medium">Schema Type</label>
              <select className="p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplHeaderType} onChange={e => setTplHeaderType(e.target.value)}>
                <option>string</option>
                <option>number</option>
                <option>integer</option>
                <option>boolean</option>
                <option>array</option>
              </select>
              <label className="block text-sm font-medium">Status Code (optional, blank = default)</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" placeholder="e.g., 200" value={tplHeaderStatus} onChange={e => setTplHeaderStatus(e.target.value)}/>
            </div>
          )}
          {templateType === 'deprecateByTag' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Tag</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplFromTag} onChange={e => setTplFromTag(e.target.value)} required/>
            </div>
          )}
          {templateType === 'movePath' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">From Path</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" placeholder="/old" value={tplFromPath} onChange={e => setTplFromPath(e.target.value)} required/>
              <label className="block text-sm font-medium">To Path</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" placeholder="/new" value={tplToPath} onChange={e => setTplToPath(e.target.value)} required/>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-600 p-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Action(s)</button>
          </div>
        </form>
      )}
    </SimpleModal>
  );
};

function escapeJsonPathKey(key: string): string {
  return `['${String(key).replace(/'/g, "\\'")}']`;
}

export default OverlayTemplatesModal;

