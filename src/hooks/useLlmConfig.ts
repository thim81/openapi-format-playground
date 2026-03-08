import { useState, useCallback, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LlmProvider {
  id: string;
  label: string;
  models: { id: string; label: string }[];
  baseUrl: string;
}

export interface LlmConfig {
  providerId: string;
  modelId: string;
  apiKey: string;
}

/* ------------------------------------------------------------------ */
/*  Built-in providers                                                 */
/* ------------------------------------------------------------------ */

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
    baseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    models: [{ id: 'custom', label: 'Default' }],
    baseUrl: '',
  },
];

/* ------------------------------------------------------------------ */
/*  Storage key                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'chat-llm-config';

function loadConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { providerId: 'openai', modelId: 'gpt-4o', apiKey: '' };
}

function saveConfig(config: LlmConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useLlmConfig() {
  const [config, setConfigState] = useState<LlmConfig>(loadConfig);

  const setConfig = useCallback((update: Partial<LlmConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...update };
      saveConfig(next);
      return next;
    });
  }, []);

  const provider = LLM_PROVIDERS.find((p) => p.id === config.providerId) || LLM_PROVIDERS[0];
  const isConfigured = config.apiKey.trim().length > 0;

  return { config, setConfig, provider, isConfigured, providers: LLM_PROVIDERS };
}
