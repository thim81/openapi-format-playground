import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Github, Terminal, Share2, FileCode2, Loader2 } from 'lucide-react';

interface HeaderProps {
  outputLanguage: 'json' | 'yaml';
  onOutputLanguageChange: (lang: 'json' | 'yaml') => void;
  inputVersion: string;
  convertVersion: string;
  convertibleTargets: string[];
  onConvertVersionChange: (v: string) => void;
  onOpenInstructions: () => void;
  onShare: () => void;
  isProcessing?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  outputLanguage,
  onOutputLanguageChange,
  inputVersion,
  convertVersion,
  convertibleTargets,
  onConvertVersionChange,
  onOpenInstructions,
  onShare,
  isProcessing = false,
}) => {
  return (
    <header
      className='h-12 flex items-center justify-between px-4 border-b-2 bg-card'
      style={{ borderBottomColor: 'hsl(var(--primary))' }}
    >
      <div className='flex items-center gap-3'>
        <FileCode2 className='h-6 w-6 text-primary' />
        <h1 className='text-base font-bold tracking-tight'>
          OpenAPI-Format <span className='text-muted-foreground font-normal'>Playground</span>
        </h1>
        {isProcessing && (
          <Badge variant='secondary' className='h-6 px-2 text-[11px] gap-1 font-medium'>
            <Loader2 className='h-3 w-3 animate-spin' />
            Processing...
          </Badge>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <Select
          value={outputLanguage}
          onValueChange={(v) => onOutputLanguageChange(v as 'json' | 'yaml')}
        >
          <SelectTrigger className='h-7 w-20 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='yaml'>YAML</SelectItem>
            <SelectItem value='json'>JSON</SelectItem>
          </SelectContent>
        </Select>

        {convertibleTargets.length > 0 && (
          <Select
            value={convertVersion || `v${inputVersion}`}
            onValueChange={onConvertVersionChange}
          >
            <SelectTrigger className='h-7 w-24 text-xs'>
              <SelectValue placeholder={`→ ${inputVersion}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={`v${inputVersion}`}>→ {inputVersion}</SelectItem>
              {convertibleTargets.map((v) => (
                <SelectItem key={v} value={v}>
                  → {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className='h-5 w-px bg-border mx-1' />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onOpenInstructions}>
              <Terminal className='h-3.5 w-3.5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>CLI Instructions</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onShare}>
              <Share2 className='h-3.5 w-3.5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href='https://github.com/thim81/openapi-format'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Button variant='ghost' size='icon' className='h-7 w-7'>
                <Github className='h-3.5 w-3.5' />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>GitHub</TooltipContent>
        </Tooltip>

        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
