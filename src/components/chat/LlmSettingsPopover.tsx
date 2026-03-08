import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Eye, EyeOff, Check } from 'lucide-react';
import { useLlmConfig, LLM_PROVIDERS } from '@/hooks/useLlmConfig';
import { cn } from '@/lib/utils';

interface LlmSettingsPopoverProps {
  className?: string;
}

const LlmSettingsPopover: React.FC<LlmSettingsPopoverProps> = ({ className }) => {
  const { config, setConfig, provider, isConfigured } = useLlmConfig();
  const [showKey, setShowKey] = useState(false);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className={cn('h-7 w-7 relative', className)}
          title='LLM Settings'
        >
          <Settings className='h-3.5 w-3.5' />
          {isConfigured && (
            <span className='absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500' />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-72' align='end' side='bottom'>
        <div className='space-y-3'>
          <div>
            <h4 className='text-sm font-semibold text-foreground'>LLM Configuration</h4>
            <p className='text-[11px] text-muted-foreground mt-0.5'>
              Provide your own API key to enable AI responses.
            </p>
          </div>

          {/* Provider */}
          <div className='space-y-1.5'>
            <Label className='text-xs'>Provider</Label>
            <Select
              value={config.providerId}
              onValueChange={(v) => {
                const newProvider = LLM_PROVIDERS.find((p) => p.id === v);
                setConfig({
                  providerId: v,
                  modelId: newProvider?.models[0]?.id || 'custom',
                });
              }}
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className='text-xs'>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className='space-y-1.5'>
            <Label className='text-xs'>Model</Label>
            <Select value={config.modelId} onValueChange={(v) => setConfig({ modelId: v })}>
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m.id} value={m.id} className='text-xs'>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className='space-y-1.5'>
            <Label className='text-xs'>API Key</Label>
            <div className='relative'>
              <Input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
                placeholder='sk-…'
                className='h-8 text-xs pr-8 font-mono'
              />
              <button
                type='button'
                onClick={() => setShowKey(!showKey)}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
              >
                {showKey ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
              </button>
            </div>
            <p className='text-[10px] text-muted-foreground'>
              Stored locally in your browser. Never sent to our servers.
            </p>
          </div>

          {/* Status */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs',
              isConfigured
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isConfigured ? (
              <>
                <Check className='h-3 w-3' />
                Connected to {provider.label}
              </>
            ) : (
              'No API key configured — using mock responses'
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LlmSettingsPopover;
