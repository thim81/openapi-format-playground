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

interface MetricsBarProps {
  totalPaths: number;
  totalTags: number;
  totalComponents: number;
  totalUnusedComponents: number;
  components?: ComponentMetrics;
  unusedComponents?: ComponentMetrics;
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
            <span className="ml-2">{isCollapsed ? '▼' : '▲'}</span>
          )}
        </h4>
        {!isCollapsed && items.length > 0 && (
          <ul className="list-disc list-inside mt-2">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const MetricsBar: React.FC<MetricsBarProps> = ({
  totalPaths,
  totalTags,
  totalComponents,
  totalUnusedComponents,
  components = { schemas: [], responses: [], parameters: [], examples: [], requestBodies: [], headers: [], meta: { total: 0 } },
  unusedComponents = { schemas: [], responses: [], parameters: [], examples: [], requestBodies: [], headers: [], meta: { total: 0 } },
}) => {
  const [expandableHeight, setExpandableHeight] = useState(0);

  const toggleMetricsBar = () => {
    setExpandableHeight((prevHeight) => (prevHeight === 0 ? 200 : 0));
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
      className={`fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 transition-all duration-300 ease-in-out ${expandableHeight > 0 ? 'h-82 overflow-y-auto' : 'h-10'}`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-200 hover:bg-gray-300 cursor-pointer" onClick={toggleMetricsBar}>
        <div className="flex space-x-4">
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Total Paths: {totalPaths}</span>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Total Tags: {totalTags}</span>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Components: {totalComponents}</span>
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">Unused Components: {totalUnusedComponents}</span>
        </div>
        <div className="text-center cursor-pointer" onClick={toggleMetricsBar}>
          {expandableHeight > 0 ? 'Collapse ▼' : 'Expand ▲'}
        </div>
      </div>
      {expandableHeight > 0 && (
        <div className="p-4 h-full">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Total Components
                <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                  {totalComponents}
                </span>
              </h3>
              {componentSections.map((section) => (
                <ComponentSection key={section.title} title={section.title} items={section.items} />
              ))}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Unused Components
                <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
                  {totalUnusedComponents}
                </span>
              </h3>
              {unusedComponentSections.map((section) => (
                <ComponentSection key={section.title} title={section.title} items={section.items} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsBar;
