import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Filter,
  Search,
  X,
  CheckSquare,
  Square,
  Tag,
  Route,
  Code2,
  FileJson,
  Globe,
  Braces,
} from 'lucide-react';
import type { AnalyzeOpenApiResult } from 'openapi-format';

interface FilterFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedOptions: Record<string, string[]>) => void;
  filterOptions: AnalyzeOpenApiResult;
}

type SelectedOptions = Record<string, string[]>;

const categoryMeta: Record<string, { label: string; icon: React.ReactNode; description: string }> =
  {
    methods: {
      label: 'Methods',
      icon: <Globe className='h-4 w-4' />,
      description: 'HTTP methods (GET, POST, etc.)',
    },
    tags: { label: 'Tags', icon: <Tag className='h-4 w-4' />, description: 'API operation tags' },
    operationIds: {
      label: 'Operation IDs',
      icon: <Code2 className='h-4 w-4' />,
      description: 'Unique operation identifiers',
    },
    operations: {
      label: 'Operations',
      icon: <Route className='h-4 w-4' />,
      description: 'API path operations',
    },
    flags: { label: 'Flags', icon: <Braces className='h-4 w-4' />, description: 'OpenAPI flags' },
    responseContent: {
      label: 'Response Content',
      icon: <FileJson className='h-4 w-4' />,
      description: 'Response content types',
    },
    requestContent: {
      label: 'Request Content',
      icon: <FileJson className='h-4 w-4' />,
      description: 'Request content types',
    },
    requestcontent: {
      label: 'Request Content',
      icon: <FileJson className='h-4 w-4' />,
      description: 'Request content types',
    },
  };

const getCategoryInfo = (key: string) =>
  categoryMeta[key] || {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    icon: <Filter className='h-4 w-4' />,
    description: `Filter by ${key}`,
  };

const FilterFormDialog: React.FC<FilterFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  filterOptions,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
  const [cleanedOptions, setCleanedOptions] = useState<Record<string, string[]>>({});
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => Object.keys(cleanedOptions), [cleanedOptions]);

  useEffect(() => {
    if (filterOptions) {
      const cleaned: Record<string, string[]> = {};
      Object.entries(filterOptions).forEach(([key, value]) => {
        if (key === 'paths') return;
        if (Array.isArray(value)) {
          const unique = Array.from(new Set(value));
          if (unique.length > 0) {
            cleaned[key] = unique;
          }
        }
      });
      setCleanedOptions(cleaned);
      const initial: SelectedOptions = {};
      Object.keys(cleaned).forEach((k) => {
        initial[k] = [];
      });
      setSelectedOptions(initial);
      const firstKey = Object.keys(cleaned)[0];
      if (firstKey) setActiveCategory(firstKey);
    }
  }, [filterOptions]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeCategory]);

  const handleChange = (category: string, value: string) => {
    setSelectedOptions((prev) => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleSelectAll = (category: string) => {
    const items = filteredItems;
    const current = selectedOptions[category] || [];
    const allFilteredSelected = items.every((item) => current.includes(item));
    setSelectedOptions((prev) => {
      if (allFilteredSelected) {
        return { ...prev, [category]: current.filter((v) => !items.includes(v)) };
      } else {
        const merged = new Set([...current, ...items]);
        return { ...prev, [category]: Array.from(merged) };
      }
    });
  };

  const handleClearCategory = (category: string) => {
    setSelectedOptions((prev) => ({ ...prev, [category]: [] }));
  };

  const handleClearAll = () => {
    const initial: SelectedOptions = {};
    categories.forEach((k) => {
      initial[k] = [];
    });
    setSelectedOptions(initial);
  };

  const activeItems = cleanedOptions[activeCategory] || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return activeItems;
    const q = searchQuery.toLowerCase();
    return activeItems.filter((item) => item.toLowerCase().includes(q));
  }, [activeItems, searchQuery]);

  const totalSelected = Object.values(selectedOptions).reduce((sum, arr) => sum + arr.length, 0);
  const activeCategoryInfo = getCategoryInfo(activeCategory);
  const activeSelectedCount = selectedOptions[activeCategory]?.length || 0;
  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => (selectedOptions[activeCategory] || []).includes(item));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[94vw] max-w-[94vw] h-[90vh] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden'>
        {/* Header */}
        <div className='px-6 pt-5 pb-4 border-b bg-gradient-to-b from-muted/50 to-transparent'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2.5'>
              <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
                <Filter className='h-4 w-4 text-primary' />
              </div>
              Filter Options
              {totalSelected > 0 && (
                <Badge variant='default' className='ml-1 text-[10px] font-mono'>
                  {totalSelected} selected
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Two-panel layout */}
        <div className='flex flex-1 min-h-0'>
          {/* Left sidebar — category list */}
          <div className='w-56 border-r bg-muted/20 flex flex-col shrink-0'>
            <div className='px-3 py-2 border-b'>
              <p className='text-[10px] uppercase tracking-wider text-muted-foreground font-semibold'>
                Categories
              </p>
            </div>
            <div className='flex-1 overflow-y-auto py-1'>
              {categories.map((cat) => {
                const info = getCategoryInfo(cat);
                const count = cleanedOptions[cat]?.length || 0;
                const selected = selectedOptions[cat]?.length || 0;
                const isActive = cat === activeCategory;

                return (
                  <button
                    key={cat}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <span
                      className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {info.icon}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-medium truncate'>{info.label}</div>
                      <div className='text-[10px] text-muted-foreground'>{count} items</div>
                    </div>
                    {selected > 0 && (
                      <Badge className='text-[10px] px-1.5 py-0 h-[18px] font-mono shrink-0 bg-primary/15 text-primary border-0'>
                        {selected}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selection summary */}
            {totalSelected > 0 && (
              <div className='border-t px-3 py-2.5 bg-muted/30'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground'>
                    {totalSelected} total selected
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-6 text-[10px] text-destructive hover:text-destructive'
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — items for active category */}
          <div className='flex-1 flex flex-col min-w-0'>
            {/* Category header + search */}
            <div className='px-4 py-3 border-b space-y-2.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground'>{activeCategoryInfo.icon}</span>
                  <div>
                    <h3 className='text-sm font-semibold'>{activeCategoryInfo.label}</h3>
                    <p className='text-[11px] text-muted-foreground'>
                      {activeCategoryInfo.description}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-[11px] gap-1'
                    onClick={() => handleSelectAll(activeCategory)}
                  >
                    {allFilteredSelected ? (
                      <>
                        <Square className='h-3 w-3' /> Deselect {searchQuery ? 'filtered' : 'all'}
                      </>
                    ) : (
                      <>
                        <CheckSquare className='h-3 w-3' /> Select{' '}
                        {searchQuery ? 'filtered' : 'all'}
                      </>
                    )}
                  </Button>
                  {activeSelectedCount > 0 && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-[11px] gap-1 text-destructive hover:text-destructive'
                      onClick={() => handleClearCategory(activeCategory)}
                    >
                      <X className='h-3 w-3' /> Clear ({activeSelectedCount})
                    </Button>
                  )}
                </div>
              </div>
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder={`Search ${activeCategoryInfo.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='h-8 pl-8 text-sm'
                />
                {searchQuery && (
                  <button
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                    onClick={() => setSearchQuery('')}
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className='text-[11px] text-muted-foreground'>
                  Showing {filteredItems.length} of {activeItems.length} items
                </p>
              )}
            </div>

            {/* Items grid */}
            <div className='flex-1 overflow-y-auto p-4'>
              {filteredItems.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                  <Search className='h-8 w-8 mb-2 opacity-30' />
                  <p className='text-sm'>No items match your search</p>
                </div>
              ) : (
                <div className='grid grid-cols-2 lg:grid-cols-4 gap-1.5'>
                  {filteredItems.map((item) => {
                    const isChecked = selectedOptions[activeCategory]?.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-primary/8 border-primary/30 shadow-sm'
                            : 'border-transparent hover:bg-muted/60 hover:border-border'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleChange(activeCategory, item)}
                        />
                        <span className='truncate font-mono text-[12px]'>{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t bg-muted/20 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            {totalSelected > 0 && (
              <div className='flex flex-wrap gap-1 max-w-[400px]'>
                {categories.map((cat) => {
                  const count = selectedOptions[cat]?.length || 0;
                  if (count === 0) return null;
                  const info = getCategoryInfo(cat);
                  return (
                    <Badge key={cat} variant='secondary' className='text-[10px] gap-1 pr-1'>
                      {info.label}: {count}
                      <button
                        className='ml-0.5 hover:text-destructive transition-colors'
                        onClick={() => handleClearCategory(cat)}
                      >
                        <X className='h-2.5 w-2.5' />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSubmit(selectedOptions)} className='gap-1.5 shadow-sm'>
              <Filter className='h-3.5 w-3.5' />
              Apply Filters
              {totalSelected > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 text-[10px] bg-primary-foreground/20 text-primary-foreground'
                >
                  {totalSelected}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterFormDialog;
