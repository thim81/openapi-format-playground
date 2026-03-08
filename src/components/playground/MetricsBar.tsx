import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Route, Tags, Box, AlertTriangle, Layers } from 'lucide-react';
import type { ComponentMetrics } from '@/lib/openapi-processor';

interface OverlayAction {
  target: string;
  remove?: boolean;
  update?: unknown;
  add?: unknown;
}

interface MetricsBarProps {
  totalPaths: number;
  totalTags: number;
  totalComponents: number;
  totalUnusedComponents: number;
  components?: ComponentMetrics;
  unusedComponents?: ComponentMetrics;
  totalActions: number;
  totalUsedActions: number;
  totalUnusedActions: number;
  usedActions: OverlayAction[];
  unusedActions: OverlayAction[];
}

const ComponentSection: React.FC<{
  title: string;
  total: number;
  metrics?: ComponentMetrics;
  accentClass: string;
  bgClass: string;
}> = ({ title, total, metrics, accentClass, bgClass }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categories = [
    { key: 'schemas', label: 'Schemas' },
    { key: 'responses', label: 'Responses' },
    { key: 'parameters', label: 'Parameters' },
    { key: 'examples', label: 'Examples' },
    { key: 'requestBodies', label: 'Request Bodies' },
    { key: 'headers', label: 'Headers' },
  ];

  return (
    <div className={`rounded-lg border p-4 ${bgClass}`}>
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
        {title}
        <span className={`inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-full text-xs font-bold ${accentClass}`}>
          {total}
        </span>
      </h4>
      <div className="space-y-1">
        {categories.map(({ key, label }) => {
          const items = (metrics as any)?.[key] as string[] | undefined;
          const count = items?.length || 0;
          const isExpanded = expandedCategories.has(key);

          return (
            <div key={key}>
              <button
                className="flex items-center gap-2 w-full text-left py-1 px-2 -mx-2 hover:bg-accent/40 rounded-md transition-colors disabled:opacity-40"
                onClick={() => count > 0 && setExpandedCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                })}
                disabled={count === 0}
              >
                <span className="text-sm flex-1">{label}</span>
                <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${count > 0 ? accentClass : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
                {count > 0 && (
                  isExpanded
                    ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    : <ChevronUp className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {isExpanded && count > 0 && (
                <ul className="ml-3 mt-1 mb-2 space-y-0.5 border-l-2 border-border pl-3">
                  {items!.map((item) => (
                    <li key={item} className="text-xs text-muted-foreground font-mono py-0.5">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActionSection: React.FC<{
  title: string;
  actions: OverlayAction[];
  accentClass: string;
}> = ({ title, actions, accentClass }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-4 bg-card">
      <button
        className="w-full text-left flex items-center gap-2 disabled:cursor-default"
        onClick={() => setExpanded((v) => !v)}
        disabled={actions.length === 0}
      >
        <h4 className="text-sm font-bold">{title}</h4>
        <span className={`inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-full text-xs font-bold ${accentClass}`}>
          {actions.length}
        </span>
        {actions.length > 0 && (
          expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" /> : <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto" />
        )}
      </button>
      {expanded && actions.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {actions.map((action, idx) => {
            const actionType = action.remove ? 'remove' : action.add !== undefined ? 'add' : 'update';
            return (
              <li key={`${action.target}-${idx}`} className="text-xs">
                <span className="font-mono px-1.5 py-0.5 rounded bg-muted mr-2">{actionType}</span>
                <span className="font-mono text-muted-foreground break-all">{action.target}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const MetricPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  bgClass: string;
  textClass: string;
}> = ({ icon, label, value, bgClass, textClass }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bgClass}`}>
    {icon}
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
    <span className={`text-xs font-bold font-mono ${textClass}`}>{value}</span>
  </div>
);

const MetricsBar: React.FC<MetricsBarProps> = ({
  totalPaths,
  totalTags,
  totalComponents,
  totalUnusedComponents,
  components,
  unusedComponents,
  totalActions,
  totalUsedActions,
  totalUnusedActions,
  usedActions,
  unusedActions,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t bg-card shrink-0 relative">
      <button
        className="w-full h-9 flex items-center gap-2 px-4 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <MetricPill
          icon={<Route className="h-3 w-3 text-primary" />}
          label="Paths"
          value={totalPaths}
          bgClass="bg-primary/10"
          textClass="text-primary"
        />
        <MetricPill
          icon={<Tags className="h-3 w-3 text-accent-foreground" />}
          label="Tags"
          value={totalTags}
          bgClass="bg-accent/60"
          textClass="text-accent-foreground"
        />
        <MetricPill
          icon={<Box className="h-3 w-3 text-primary" />}
          label="Components"
          value={totalComponents}
          bgClass="bg-secondary"
          textClass="text-secondary-foreground"
        />
        <MetricPill
          icon={<AlertTriangle className={`h-3 w-3 ${totalUnusedComponents > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}
          label="Unused"
          value={totalUnusedComponents}
          bgClass={totalUnusedComponents > 0 ? 'bg-destructive/10' : 'bg-muted'}
          textClass={totalUnusedComponents > 0 ? 'text-destructive' : 'text-muted-foreground'}
        />
        {totalActions > 0 && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <MetricPill
              icon={<Layers className="h-3 w-3 text-primary" />}
              label="Actions"
              value={totalActions}
              bgClass="bg-primary/10"
              textClass="text-primary"
            />
          </>
        )}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span className="text-[10px]">{expanded ? 'Collapse' : 'Details'}</span>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="absolute bottom-full left-0 right-0 border-t border-b bg-card shadow-lg max-h-[300px] overflow-y-auto z-20">
          <div className="px-4 py-4 grid grid-cols-2 gap-4 bg-muted/20">
            <ComponentSection
              title="Total Components"
              total={totalComponents}
              metrics={components}
              accentClass="bg-primary/15 text-primary"
              bgClass="bg-card"
            />
            <ComponentSection
              title="Unused Components"
              total={totalUnusedComponents}
              metrics={unusedComponents}
              accentClass={totalUnusedComponents > 0 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'}
              bgClass="bg-card"
            />
            {totalActions > 0 && (
              <ActionSection
                title={`Applied Overlay Actions (${totalUsedActions})`}
                actions={usedActions}
                accentClass="bg-primary/15 text-primary"
              />
            )}
            {totalActions > 0 && (
              <ActionSection
                title={`Unused Overlay Actions (${totalUnusedActions})`}
                actions={unusedActions}
                accentClass={totalUnusedActions > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsBar;
