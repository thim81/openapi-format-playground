import React, { useState } from 'react';

export interface ComponentMetrics {
  schemas: string[];
  responses: string[];
  parameters: string[];
  examples: string[];
  requestBodies: string[];
  headers: string[];
  meta: {
    total: number;
  };
}

interface OverlayAction {
  target: string;
  remove?: boolean;
  update?: string;
}

interface MetricsBarProps {
  totalPaths: number;
  totalTags: number;
  totalComponents: number;
  totalUnusedComponents: number;
  components?: ComponentMetrics;
  unusedComponents?: ComponentMetrics;
  totalActions: number;
  totalUsedActions:number;
  totalUnusedActions: number;
  unusedActions: OverlayAction[];
  usedActions: OverlayAction[];
}

const ComponentSection: React.FC<{ title: string; items: string[] }> = ({ title, items }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSection = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-4">
      <div className="cursor-pointer" onClick={toggleSection}>
        <h4 className="text-md font-semibold flex items-center">
          {title}
          <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
            {items.length}
          </span>
          {items.length > 0 && (
            <span className="ml-2">{isCollapsed ? '▲' : '▼'}</span>
          )}
        </h4>
        {!isCollapsed && items.length > 0 && (
          <div className="mt-2">
            <ul className="list-disc list-inside max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionSection: React.FC<{
  title: string
  actions: OverlayAction[],
  totalActions: number
}> = ({actions, totalActions, title}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSection = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-4">
      <div className="cursor-pointer mb-4" onClick={toggleSection}>
        <h4 className="text-md font-semibold flex items-center">
          {title}
          <span
            className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
            {actions.length}
          </span>
          {actions.length > 0 && (
            <span className="ml-2">{isCollapsed ? '▲' : '▼'}</span>
          )}
        </h4>
        {!isCollapsed && actions.length > 0 && (
          <div className="mt-2">
            <ul className="list-disc list-inside max-h-60 overflow-y-auto">
              {actions.map((action, index) => (
                <li key={index}>
                  Target: {action.target} - Type: {action.update ? 'update' : action.remove ? 'remove' : 'unknown'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricsBar: React.FC<MetricsBarProps> = (
  {
    totalPaths,
    totalTags,
    totalComponents,
    totalUnusedComponents,
    components = {
      schemas: [],
      responses: [],
      parameters: [],
      examples: [],
      requestBodies: [],
      headers: [],
      meta: {total: 0}
    },
    unusedComponents = {
      schemas: [],
      responses: [],
      parameters: [],
      examples: [],
      requestBodies: [],
      headers: [],
      meta: {total: 0}
    },
    totalActions,
    totalUsedActions,
    totalUnusedActions,
    unusedActions,
    usedActions
  }) => {
  const [expandableHeight, setExpandableHeight] = useState(0);

  const toggleMetricsBar = () => {
    if (totalComponents > 0) {
      setExpandableHeight((prevHeight) => (prevHeight === 0 ? 200 : 0));
    }
  };

  const componentSections = [
    { title: 'Schemas', items: components.schemas },
    { title: 'Responses', items: components.responses },
    { title: 'Parameters', items: components.parameters },
    { title: 'Examples', items: components.examples },
    { title: 'Request Bodies', items: components.requestBodies },
    { title: 'Headers', items: components.headers },
  ];

  const unusedComponentSections = [
    { title: 'Schemas', items: unusedComponents.schemas },
    { title: 'Responses', items: unusedComponents.responses },
    { title: 'Parameters', items: unusedComponents.parameters },
    { title: 'Examples', items: unusedComponents.examples },
    { title: 'Request Bodies', items: unusedComponents.requestBodies },
    { title: 'Headers', items: unusedComponents.headers },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-gray-100  dark:bg-gray-900 border-t border-gray-300 dark:border-gray-500 transition-all duration-300 ease-in-out ${expandableHeight > 0 ? 'h-82 overflow-y-auto' : 'h-10'}`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer" onClick={toggleMetricsBar}>
        <div className="flex space-x-4">
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Paths: {totalPaths}</span>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Tags: {totalTags}</span>
          {totalComponents > 0 && (<span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Components: {totalComponents}</span>)}
          {totalUnusedComponents > 0 && (<span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">Unused Components: {totalUnusedComponents}</span>)}
          {totalActions > 0 && (<span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">Overlay Actions: {totalActions}</span>)}
          {totalUnusedActions > 0 && (<span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            Unused Overlay Actions: {totalUnusedActions}
          </span>)}
        </div>
      </div>
      {expandableHeight > 0 && (
        <div className="p-4 h-full">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Total Components
                <span
                  className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                  {totalComponents}
                </span>
              </h3>
              {componentSections.map((section) => (
                <ComponentSection key={section.title} title={section.title} items={section.items}/>
              ))}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Unused Components
                <span
                  className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                  {totalUnusedComponents}
                </span>
              </h3>
              {unusedComponentSections.map((section) => (
                <ComponentSection key={section.title} title={section.title} items={section.items}/>
              ))}

            </div>
            {totalActions > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center">
                  Total Overlay actions
                  <span
                    className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                  {totalActions}
                </span>
                </h3>
                <ActionSection actions={usedActions} totalActions={totalUsedActions} title="Applied Overlay Actions"/>
                <ActionSection actions={unusedActions} totalActions={totalUnusedActions} title="Unused Overlay Actions"/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsBar;
