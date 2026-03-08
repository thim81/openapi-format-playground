import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Settings2,
  Filter,
  Layers,
  Wand2,
  Type,
  ArrowUpDown,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import MonacoEditor from './MonacoEditor';

interface ConfigSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Sort
  sort: boolean;
  onSortChange: (v: boolean) => void;
  defaultFieldSorting: boolean;
  onDefaultFieldSortingChange: () => void;
  pathSort: 'original' | 'path' | 'tags';
  onPathSortChange: (v: 'original' | 'path' | 'tags') => void;
  onOpenSortModal: () => void;
  // Keep comments
  keepComments: boolean;
  onKeepCommentsChange: (v: boolean) => void;
  outputLanguage: 'json' | 'yaml';
  // Overlay
  toggleOverlay: boolean;
  onToggleOverlay: (v: boolean) => void;
  onOpenOverlayModal: () => void;
  // Filter
  toggleFilter: boolean;
  onToggleFilter: (v: boolean) => void;
  filterSet: string;
  onFilterSetChange: (v: string) => void;
  filterUnused: boolean;
  onToggleFilterUnused: () => void;
  filterPrevent: boolean;
  onTogglePreserve: () => void;
  onOpenFilterForm: () => void;
  hasFilterFormOptions: boolean;
  onDownloadFilter: () => void;
  // Generate
  toggleGenerate: boolean;
  onToggleGenerate: (v: boolean) => void;
  onOpenGenerateModal: () => void;
  // Casing
  toggleCasing: boolean;
  onToggleCasing: (v: boolean) => void;
  onOpenCasingModal: () => void;
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = (props) => {
  if (props.collapsed) {
    return (
      <div className='w-10 flex flex-col items-center py-3 bg-card border-r gap-2'>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={props.onToggleCollapse}>
          <PanelRightClose className='h-4 w-4' />
        </Button>
        <div className='h-px w-6 bg-border my-1' />
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground'
          onClick={props.onToggleCollapse}
        >
          <ArrowUpDown className='h-3.5 w-3.5' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground'
          onClick={props.onToggleCollapse}
        >
          <Layers className='h-3.5 w-3.5' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground'
          onClick={props.onToggleCollapse}
        >
          <Filter className='h-3.5 w-3.5' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground'
          onClick={props.onToggleCollapse}
        >
          <Settings2 className='h-3.5 w-3.5' />
        </Button>
      </div>
    );
  }

  return (
    <div className='w-72 flex flex-col bg-card border-r overflow-hidden'>
      <div className='flex items-center justify-between px-3 py-1.5 border-b'>
        <h2 className='text-sm font-semibold'>Configuration</h2>
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={props.onToggleCollapse}>
          <PanelRightOpen className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <Accordion
          type='multiple'
          defaultValue={['sort', 'overlay', 'filter', 'extra']}
          className='px-3'
        >
          {/* SORT OPTIONS */}
          <AccordionItem value='sort'>
            <AccordionTrigger className='py-2 text-sm font-medium hover:no-underline'>
              <span className='flex items-center gap-2'>
                <ArrowUpDown className='h-3.5 w-3.5 text-primary' />
                Sort Options
              </span>
            </AccordionTrigger>
            <AccordionContent className='space-y-3 pb-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Sort OpenAPI</Label>
                <Switch
                  checked={props.sort}
                  onCheckedChange={props.onSortChange}
                  className='scale-75'
                />
              </div>

              {props.outputLanguage === 'yaml' && (
                <div className='flex items-center justify-between'>
                  <Label className='text-xs'>Keep comments</Label>
                  <Switch
                    checked={props.keepComments}
                    onCheckedChange={props.onKeepCommentsChange}
                    className='scale-75'
                  />
                </div>
              )}

              {props.sort && (
                <>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs'>Custom field sorting</Label>
                    <div className='flex items-center gap-1'>
                      <Switch
                        checked={!props.defaultFieldSorting}
                        onCheckedChange={props.onDefaultFieldSortingChange}
                        className='scale-75'
                      />
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 text-[10px] px-2'
                        onClick={props.onOpenSortModal}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-xs'>Sort Paths By</Label>
                    <Select
                      value={props.pathSort}
                      onValueChange={(v) => props.onPathSortChange(v as any)}
                    >
                      <SelectTrigger className='h-7 text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='original'>Original order</SelectItem>
                        <SelectItem value='path'>Path</SelectItem>
                        <SelectItem value='tags'>Tag name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* OVERLAY */}
          <AccordionItem value='overlay'>
            <AccordionTrigger className='py-2 text-sm font-medium hover:no-underline'>
              <span className='flex items-center gap-2'>
                <Layers className='h-3.5 w-3.5 text-primary' />
                OpenAPI Overlay
              </span>
            </AccordionTrigger>
            <AccordionContent className='space-y-3 pb-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Apply Overlay</Label>
                <div className='flex items-center gap-1'>
                  <Switch
                    checked={props.toggleOverlay}
                    onCheckedChange={props.onToggleOverlay}
                    className='scale-75'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 text-[10px] px-2'
                    onClick={props.onOpenOverlayModal}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FILTER OPTIONS */}
          <AccordionItem value='filter'>
            <AccordionTrigger className='py-2 text-sm font-medium hover:no-underline'>
              <span className='flex items-center gap-2'>
                <Filter className='h-3.5 w-3.5 text-primary' />
                Filter Options
              </span>
            </AccordionTrigger>
            <AccordionContent className='space-y-3 pb-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Apply Filter</Label>
                <div className='flex items-center gap-1'>
                  <Switch
                    checked={props.toggleFilter}
                    onCheckedChange={props.onToggleFilter}
                    className='scale-75'
                  />
                  {props.hasFilterFormOptions && (
                    <>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 text-[10px] px-2'
                        onClick={props.onOpenFilterForm}
                        disabled={!props.toggleFilter}
                      >
                        Configure
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 text-[10px] px-2'
                        onClick={props.onDownloadFilter}
                      >
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className='h-[240px] border rounded-md overflow-hidden'>
                <MonacoEditor
                  value={props.filterSet}
                  onChange={props.onFilterSetChange}
                  language={props.outputLanguage}
                  height='240px'
                  showLineNumbers={false}
                  readOnly={!props.toggleFilter}
                />
              </div>

              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Filter Unused Components</Label>
                <Switch
                  checked={props.filterUnused}
                  onCheckedChange={props.onToggleFilterUnused}
                  className='scale-75'
                  disabled={!props.toggleFilter}
                />
              </div>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Preserve Empty Objects</Label>
                <Switch
                  checked={props.filterPrevent}
                  onCheckedChange={props.onTogglePreserve}
                  className='scale-75'
                  disabled={!props.toggleFilter}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* EXTRA OPTIONS */}
          <AccordionItem value='extra'>
            <AccordionTrigger className='py-2 text-sm font-medium hover:no-underline'>
              <span className='flex items-center gap-2'>
                <Settings2 className='h-3.5 w-3.5 text-primary' />
                Extra Options
              </span>
            </AccordionTrigger>
            <AccordionContent className='space-y-3 pb-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Generate OperationId</Label>
                <div className='flex items-center gap-1'>
                  <Switch
                    checked={props.toggleGenerate}
                    onCheckedChange={props.onToggleGenerate}
                    className='scale-75'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 text-[10px] px-2'
                    onClick={props.onOpenGenerateModal}
                  >
                    Configure
                  </Button>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>Format Casing</Label>
                <div className='flex items-center gap-1'>
                  <Switch
                    checked={props.toggleCasing}
                    onCheckedChange={props.onToggleCasing}
                    className='scale-75'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 text-[10px] px-2'
                    onClick={props.onOpenCasingModal}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default ConfigSidebar;
