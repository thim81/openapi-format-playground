import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ToolCallBubble from './ToolCallBubble';
import ActionButtons from './ActionButtons';
import type { ChatMessage, AnswerAction } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
  onActionClick?: (action: AnswerAction) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onActionClick }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn('flex max-w-[85%] flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card text-card-foreground border border-border rounded-bl-sm',
          )}
        >
          {isUser ? message.content : <MarkdownRenderer content={message.content} />}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBubble key={i} tool={tc} />
            ))}
          </div>
        )}

        {message.actions && message.actions.length > 0 && onActionClick && (
          <ActionButtons actions={message.actions} onActionClick={onActionClick} />
        )}

        <span className="text-[10px] text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
