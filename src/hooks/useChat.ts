import { useState, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  ToolCall,
  ToolDefinition,
  UseChatConfig,
} from '@/components/chat/types';

const DEFAULT_GREETING =
  "Hi! I'm your AI assistant. How can I help you today?";

export function useChat(config: UseChatConfig) {
  const {
    greeting = DEFAULT_GREETING,
    tools = [],
    generateResponse,
    context = {},
    onToolSideEffect,
  } = config;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const toolMap = useRef<Map<string, ToolDefinition>>(new Map());

  // Keep tool map in sync
  toolMap.current = new Map(tools.map((t) => [t.name, t]));

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const allMessages = [...messages, userMsg];
        const response = await generateResponse(trimmed, allMessages, context);

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          actions: response.actions,
          toolCalls: response.toolCalls?.map((tc) => ({
            name: tc.name,
            args: tc.args,
            status: 'running' as const,
          })),
          timestamp: new Date(),
        };

        // Simulate thinking delay
        await new Promise((r) => setTimeout(r, 500));
        setMessages((prev) => [...prev, assistantMsg]);

        // Execute tool calls sequentially
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (let i = 0; i < response.toolCalls.length; i++) {
            const tc = response.toolCalls[i];
            const toolDef = toolMap.current.get(tc.name);

            let result: string;
            if (toolDef) {
              const toolResult = await toolDef.execute(tc.args, context);
              result = toolResult.result;
              if (toolResult.sideEffect && onToolSideEffect) {
                onToolSideEffect(tc.name, toolResult.sideEffect);
              }
            } else {
              result = `Unknown tool: ${tc.name}`;
            }

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMsg.id) return m;
                const updated = [...(m.toolCalls || [])];
                updated[i] = { ...updated[i], result, status: 'done' };
                return { ...m, toolCalls: updated };
              }),
            );
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            timestamp: new Date(),
          },
        ]);
      }

      setIsThinking(false);
    },
    [isThinking, messages, generateResponse, context, onToolSideEffect],
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      },
    ]);
  }, [greeting]);

  return { messages, isThinking, sendMessage, clearMessages };
}
