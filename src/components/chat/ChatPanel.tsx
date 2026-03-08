import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Sparkles, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import LlmSettingsPopover from './LlmSettingsPopover';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import type { ChatMessage, AnswerAction } from './types';

/* ------------------------------------------------------------------ */
/*  Quick action chip                                                  */
/* ------------------------------------------------------------------ */

export interface QuickAction {
  label: string;
  prompt: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  /** Chat state from useChat */
  messages: ChatMessage[];
  isThinking: boolean;
  onSend: (text: string) => void;
  onClear?: () => void;
  /** Panel branding */
  title?: string;
  subtitle?: string;
  /** Suggested quick actions shown when conversation is fresh */
  quickActions?: QuickAction[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChatPanel: React.FC<ChatPanelProps> = ({
  open,
  onClose,
  messages,
  isThinking,
  onSend,
  onClear,
  title = 'AI Assistant',
  subtitle,
  quickActions = [],
  className,
}) => {
  const [input, setInput] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: AnswerAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.prompt) {
      onSend(action.prompt);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l border-border bg-background shadow-xl',
            className,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LlmSettingsPopover />
              {onClear && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear} title="Clear conversation">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onActionClick={handleActionClick} />
              ))}

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Thinking…
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Quick actions */}
          {messages.length <= 1 && quickActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => {
                    setInput(qa.prompt);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <ChevronDown className="h-2.5 w-2.5" />
              <span>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
