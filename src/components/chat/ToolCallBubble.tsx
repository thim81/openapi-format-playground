import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2 } from 'lucide-react';
import type { ToolCall } from './types';

interface ToolCallBubbleProps {
  tool: ToolCall;
}

const ToolCallBubble: React.FC<ToolCallBubbleProps> = ({ tool }) => (
  <div className='flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs'>
    <Wrench className='mt-0.5 h-3.5 w-3.5 shrink-0 text-primary' />
    <div className='min-w-0 flex-1'>
      <div className='flex items-center gap-2'>
        <span className='font-semibold text-foreground'>{tool.name}</span>
        <Badge
          variant={
            tool.status === 'done'
              ? 'default'
              : tool.status === 'error'
                ? 'destructive'
                : 'secondary'
          }
          className='text-[10px] px-1.5 py-0'
        >
          {tool.status === 'running' && <Loader2 className='mr-1 h-2.5 w-2.5 animate-spin' />}
          {tool.status}
        </Badge>
      </div>
      {tool.result && (
        <p className='mt-1 text-muted-foreground whitespace-pre-wrap'>{tool.result}</p>
      )}
    </div>
  </div>
);

export default ToolCallBubble;
