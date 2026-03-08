import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CaseSensitive, Braces, Box, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { parseString } from 'openapi-format';
import type { OpenAPICasingSet } from 'openapi-format';
import { cn } from '@/lib/utils';

const casingOptionsList = [
  { label: 'camelCase', value: 'camelCase', example: 'myPropertyName' },
  { label: 'PascalCase', value: 'PascalCase', example: 'MyPropertyName' },
  { label: 'kebab-case', value: 'kebabCase', example: 'my-property-name' },
  { label: 'Train-Case', value: 'TrainCase', example: 'My-Property-Name' },
  { label: 'snake_case', value: 'snakeCase', example: 'my_property_name' },
  { label: 'Ada_Case', value: 'AdaCase', example: 'My_Property_Name' },
  { label: 'CONSTANT_CASE', value: 'constantCase', example: 'MY_PROPERTY_NAME' },
  { label: 'COBOL-CASE', value: 'cobolCase', example: 'MY-PROPERTY-NAME' },
  { label: 'Dot.notation', value: 'dotNotation', example: 'my.property.name' },
  { label: 'Space case', value: 'spaceCase', example: 'my property name' },
  { label: 'Capital Case', value: 'capitalCase', example: 'My Property Name' },
  { label: 'lower case', value: 'lowerCase', example: 'my property name' },
  { label: 'UPPER CASE', value: 'upperCase', example: 'MY PROPERTY NAME' },
];

interface FieldGroup {
  title: string;
  icon: React.ReactNode;
  fields: { key: string; label: string }[];
}

const fieldGroups: FieldGroup[] = [
  {
    title: 'Operations',
    icon: <CaseSensitive className='h-4 w-4' />,
    fields: [{ key: 'operationId', label: 'Operation ID' }],
  },
  {
    title: 'Properties & Parameters',
    icon: <Braces className='h-4 w-4' />,
    fields: [
      { key: 'properties', label: 'Properties' },
      { key: 'parameters', label: 'Parameters' },
    ],
  },
  {
    title: 'Components',
    icon: <Box className='h-4 w-4' />,
    fields: [
      { key: 'componentsSchemas', label: 'Schemas' },
      { key: 'componentsParameters', label: 'Parameters' },
      { key: 'componentsRequestBodies', label: 'Request Bodies' },
      { key: 'componentsResponses', label: 'Responses' },
      { key: 'componentsHeaders', label: 'Headers' },
      { key: 'componentsExamples', label: 'Examples' },
    ],
  },
];

const allFieldKeys = fieldGroups.flatMap((g) => g.fields.map((f) => f.key));

interface CasingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (casingSet: OpenAPICasingSet) => void;
  casingOptions: string;
}

const CasingFormDialog: React.FC<CasingFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  casingOptions: casingOptionsStr,
}) => {
  const [casingSet, setCasingSet] = useState<OpenAPICasingSet>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(fieldGroups.map((g) => g.title)),
  );

  useEffect(() => {
    const parse = async () => {
      try {
        if (casingOptionsStr) {
          const parsed = (await parseString(casingOptionsStr)) as OpenAPICasingSet;
          setCasingSet(parsed);
        }
      } catch {}
    };
    if (isOpen) parse();
  }, [casingOptionsStr, isOpen]);

  const handleChange = (field: string, value: string) => {
    setCasingSet((prev) => {
      if (!value || value === 'none') {
        const next = { ...prev };
        delete (next as any)[field];
        return next;
      }
      return { ...prev, [field]: value };
    });
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const configuredCount = allFieldKeys.filter((k) => (casingSet as any)[k]).length;
  const totalCount = allFieldKeys.length;

  const getGroupConfiguredCount = (group: FieldGroup) =>
    group.fields.filter((f) => (casingSet as any)[f.key]).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden'>
        {/* Header */}
        <div className='px-6 pt-5 pb-4 border-b bg-gradient-to-b from-muted/50 to-transparent'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2.5'>
              <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
                <CaseSensitive className='h-4 w-4 text-primary' />
              </div>
              Format Casing
              <Badge variant='secondary' className='ml-1 text-[10px] font-mono'>
                {configuredCount}/{totalCount} configured
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          <div className='p-5 space-y-3'>
            {fieldGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.title);
              const groupCount = getGroupConfiguredCount(group);

              return (
                <div key={group.title} className='border rounded-xl overflow-hidden'>
                  {/* Group Header */}
                  <button
                    className='w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors'
                    onClick={() => toggleGroup(group.title)}
                  >
                    <div className='flex items-center gap-2.5'>
                      {isExpanded ? (
                        <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                      ) : (
                        <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
                      )}
                      <span className='text-muted-foreground'>{group.icon}</span>
                      <span className='text-sm font-semibold'>{group.title}</span>
                    </div>
                    {groupCount > 0 && (
                      <Badge
                        variant='default'
                        className='text-[10px] px-1.5 py-0 h-[18px] font-mono bg-primary/15 text-primary border-0'
                      >
                        {groupCount}
                      </Badge>
                    )}
                  </button>

                  {/* Group Fields */}
                  {isExpanded && (
                    <div className='border-t bg-card divide-y'>
                      {group.fields.map(({ key, label }) => {
                        const currentValue = (casingSet as any)[key] || '';
                        const currentOption = casingOptionsList.find(
                          (o) => o.value === currentValue,
                        );

                        return (
                          <div key={key} className='px-4 py-3 space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                {label}
                              </Label>
                              {currentOption && (
                                <code className='text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded'>
                                  {currentOption.example}
                                </code>
                              )}
                            </div>
                            {/* Casing Chips */}
                            <div className='flex flex-wrap gap-1.5'>
                              {casingOptionsList.map((opt) => {
                                const isSelected = currentValue === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() =>
                                      handleChange(key, isSelected ? 'none' : opt.value)
                                    }
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border',
                                    )}
                                  >
                                    {isSelected && <Check className='h-3 w-3' />}
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t bg-muted/20 flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(casingSet);
              onClose();
            }}
            className='gap-1.5 shadow-sm'
          >
            Apply Casing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CasingFormDialog;
