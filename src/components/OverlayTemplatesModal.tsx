import React, { useEffect, useMemo, useState } from 'react';
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
  const [templateType, setTemplateType] = useState<null | 'addServer' | 'setDefaultHeader' | 'deprecateByTag' | 'movePath'>(null);

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

  // Reset form fields when opened/closed for a clean start
  useEffect(() => {
    if (isOpen) {
      setTemplateType(null);
      setTplUrl('');
      setTplUrlDesc('');
      setTplFromTag('');
      setTplHeaderName('');
      setTplHeaderDesc('');
      setTplHeaderType('string');
      setTplHeaderStatus('');
      setTplFromPath('');
      setTplToPath('');
    }
  }, [isOpen]);

  // Build simple autocomplete suggestions from current OpenAPI
  const [suggestions, setSuggestions] = useState({
    tags: [] as string[],
    paths: [] as string[],
    statusCodes: [] as string[],
    headerNames: [] as string[],
    serverUrls: [] as string[],
  });
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out = {
        tags: [] as string[],
        paths: [] as string[],
        statusCodes: [] as string[],
        headerNames: [] as string[],
        serverUrls: [] as string[],
      };
      try {
        if (!openapi || !openapi.trim()) { if (!cancelled) setSuggestions(out); return; }
        const oa = await parseString(openapi) as any;
        const tags = new Set<string>();
        if (Array.isArray(oa?.tags)) {
          oa.tags.forEach((t: any) => { if (t?.name) tags.add(String(t.name)); });
        }
        if (oa?.paths && typeof oa.paths === 'object') {
          Object.keys(oa.paths).forEach((p) => {
            out.paths.push(p);
            const item = oa.paths[p] || {};
            const methods = ['get','post','put','delete','patch','options','head','trace'];
            methods.forEach((m) => {
              if (item[m]) {
                if (Array.isArray(item[m].tags)) item[m].tags.forEach((tg: any) => tags.add(String(tg)));
                if (item[m].responses && typeof item[m].responses === 'object') {
                  Object.keys(item[m].responses).forEach((code) => out.statusCodes.push(code));
                  Object.values(item[m].responses).forEach((resp: any) => {
                    if (resp?.headers && typeof resp.headers === 'object') {
                      Object.keys(resp.headers).forEach((hn) => out.headerNames.push(hn));
                    }
                  });
                }
              }
            });
          });
        }
        if (oa?.components?.responses && typeof oa.components.responses === 'object') {
          Object.values(oa.components.responses).forEach((resp: any) => {
            if (resp?.headers && typeof resp.headers === 'object') {
              Object.keys(resp.headers).forEach((hn) => out.headerNames.push(hn));
            }
          });
        }
        if (Array.isArray(oa?.servers)) {
          oa.servers.forEach((s: any) => { if (s?.url) out.serverUrls.push(String(s.url)); });
        }
        out.tags = Array.from(tags);
        out.paths = Array.from(new Set(out.paths));
        out.statusCodes = Array.from(new Set(out.statusCodes.concat(['default'])));
        out.headerNames = Array.from(new Set(out.headerNames));
        out.serverUrls = Array.from(new Set(out.serverUrls));
      } catch {}
      if (!cancelled) setSuggestions(out);
    };
    run();
    return () => { cancelled = true; };
  }, [openapi]);

  const isValid = useMemo(() => {
    switch (templateType) {
      case 'addServer':
        return tplUrl.trim().length > 0;
      case 'setDefaultHeader':
        return tplHeaderName.trim().length > 0;
      case 'deprecateByTag':
        return tplFromTag.trim().length > 0;
      case 'movePath':
        return tplFromPath.trim().length > 0 && tplToPath.trim().length > 0;
      default:
        return false;
    }
  }, [templateType, tplUrl, tplFromTag, tplToTag, tplHeaderName, tplFromPath, tplToPath]);

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

    if (newActions.length === 0) return;
    onAddActions(newActions);
    onRequestClose();
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
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" list="tpl-server-urls" value={tplUrl} onChange={e => setTplUrl(e.target.value)} required/>
              <datalist id="tpl-server-urls">
                {suggestions.serverUrls.slice(0, 100).map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              {tplUrl.trim().length === 0 && (<p className="text-red-600 text-xs">URL is required.</p>)}
              <label className="block text-sm font-medium">Description (optional)</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={tplUrlDesc} onChange={e => setTplUrlDesc(e.target.value)}/>
            </div>
          )}
          
          {templateType === 'setDefaultHeader' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Header Name</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" list="tpl-headers" value={tplHeaderName} onChange={e => setTplHeaderName(e.target.value)} required/>
              {tplHeaderName.trim().length === 0 && (<p className="text-red-600 text-xs">Header name is required.</p>)}
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
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" list="tpl-status-codes" placeholder="e.g., 200" value={tplHeaderStatus} onChange={e => setTplHeaderStatus(e.target.value)}/>
              <datalist id="tpl-headers">
                {suggestions.headerNames.slice(0, 300).map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
              <datalist id="tpl-status-codes">
                {suggestions.statusCodes.slice(0, 200).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          )}
          {templateType === 'deprecateByTag' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Tag</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" list="tpl-tags" value={tplFromTag} onChange={e => setTplFromTag(e.target.value)} required/>
              {tplFromTag.trim().length === 0 && (<p className="text-red-600 text-xs">Tag is required.</p>)}
              <datalist id="tpl-tags">
                {suggestions.tags.slice(0, 200).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          )}
          {templateType === 'movePath' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">From Path</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" list="tpl-paths" placeholder="/old" value={tplFromPath} onChange={e => setTplFromPath(e.target.value)} required/>
              {tplFromPath.trim().length === 0 && (<p className="text-red-600 text-xs">From path is required.</p>)}
              <label className="block text-sm font-medium">To Path</label>
              <input className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" placeholder="/new" value={tplToPath} onChange={e => setTplToPath(e.target.value)} required/>
              {tplToPath.trim().length === 0 && (<p className="text-red-600 text-xs">To path is required.</p>)}
              <datalist id="tpl-paths">
                {suggestions.paths.slice(0, 500).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onRequestClose} className="bg-gray-300 dark:bg-gray-600 p-2 rounded">Cancel</button>
            <button type="submit" disabled={!isValid} className={`p-2 rounded ${isValid ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>Add Action(s)</button>
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

function escapeForJsonPathFilter(s: string): string {
  // Escape backslashes and double quotes for inclusion inside a JSONPath filter double-quoted string
  return s.replace(/\\/g, '\\\\').replace(/\"/g, '"').replace(/"/g, '\\"');
}
