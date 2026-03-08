import { useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import type { AnswerAction, GeneratedResponse, ToolDefinition } from './types';

type UseOpenApiAssistantOptions = {
  specContent: string;
  onSpecReplace: (content: string) => void;
};

const QUICK_ACTIONS: AnswerAction[] = [
  { label: 'Validate spec', prompt: 'Validate my current spec' },
  { label: 'Add endpoint', prompt: 'Add a GET /users endpoint' },
  { label: 'Best practices', prompt: 'What are REST API best practices?' },
];

function createOpenApiTools(): ToolDefinition[] {
  return [
    {
      name: 'read_spec',
      description: 'Read the current OpenAPI specification',
      execute: async (_args, ctx) => {
        const spec = ctx.specContent as string;
        return {
          result: `Current spec has ${spec.split('\n').length} lines. Loaded successfully.`,
        };
      },
    },
    {
      name: 'validate_spec',
      description: 'Validate the OpenAPI specification',
      execute: async () => {
        await new Promise((r) => setTimeout(r, 600));
        return {
          result:
            'Validation passed ✓ — No errors found. 2 warnings: missing "contact" info, missing "license" field.',
        };
      },
    },
    {
      name: 'add_path',
      description: 'Add or update a path in the spec',
      execute: async (args) => {
        await new Promise((r) => setTimeout(r, 800));
        return {
          result: `Path "${args.path || '/new-endpoint'}" added with ${args.method || 'GET'} operation.`,
        };
      },
    },
    {
      name: 'add_schema',
      description: 'Add or update a schema component',
      execute: async (args) => {
        await new Promise((r) => setTimeout(r, 800));
        return { result: `Schema "${args.name || 'NewModel'}" added to components/schemas.` };
      },
    },
    {
      name: 'modify_spec',
      description: 'Modify the OpenAPI specification',
      execute: async () => {
        await new Promise((r) => setTimeout(r, 800));
        return { result: 'Specification updated successfully.' };
      },
    },
  ];
}

function openApiResponseGenerator(userMessage: string): GeneratedResponse {
  const lower = userMessage.toLowerCase();

  if (lower.includes('validate') || lower.includes('check')) {
    return {
      content: "I'll validate your current specification for any issues.",
      toolCalls: [{ name: 'validate_spec', args: {} }],
      actions: [
        { label: 'Fix warnings', prompt: 'Fix the validation warnings' },
        { label: 'Show details', prompt: 'Show me more details about the validation' },
      ],
    };
  }
  if (
    lower.includes('add') &&
    (lower.includes('path') || lower.includes('endpoint') || lower.includes('route'))
  ) {
    return {
      content: 'Let me add that endpoint to your spec.',
      toolCalls: [
        { name: 'read_spec', args: {} },
        { name: 'add_path', args: { path: '/users', method: 'GET' } },
      ],
      actions: [
        { label: 'Add POST too', prompt: 'Also add a POST /users endpoint' },
        { label: 'Add schema', prompt: 'Add a User schema for this endpoint' },
      ],
    };
  }
  if (lower.includes('add') && lower.includes('schema')) {
    return {
      content: "I'll create that schema for you.",
      toolCalls: [{ name: 'add_schema', args: { name: 'User', type: 'object' } }],
    };
  }
  if (lower.includes('read') || lower.includes('show') || lower.includes('current')) {
    return {
      content: 'Let me take a look at your current specification.',
      toolCalls: [{ name: 'read_spec', args: {} }],
    };
  }

  if (lower.includes('rest') || lower.includes('best practice')) {
    return {
      content:
        'Here are some REST API best practices:\n\n1. **Use nouns for resources** — `/users` not `/getUsers`\n2. **Use HTTP methods semantically** — GET for reads, POST for creates\n3. **Version your API** — e.g. `/v1/users`\n4. **Use proper status codes** — 201 for created, 404 for not found\n5. **Support pagination** for list endpoints',
      actions: [
        { label: 'Apply to my spec', prompt: 'Apply these best practices to my current spec' },
        { label: 'Security tips', prompt: 'What about API security best practices?' },
      ],
    };
  }
  if (lower.includes('security') || lower.includes('auth')) {
    return {
      content:
        'For API security in OpenAPI, consider:\n\n- Add `securitySchemes` under components (Bearer, OAuth2, API Key)\n- Apply `security` at the operation or global level\n- Document required scopes for OAuth2 flows\n- Use HTTPS — set `servers` with `https://` URLs',
    };
  }
  return {
    content:
      'I can help you with your OpenAPI spec! Try asking me to:\n\n- **Add an endpoint** — "Add a GET /users endpoint"\n- **Add a schema** — "Add a User schema"\n- **Validate** — "Check my spec for errors"\n- **Advice** — "What are REST best practices?"',
    actions: QUICK_ACTIONS,
  };
}

export function useOpenApiAssistant({ specContent, onSpecReplace }: UseOpenApiAssistantOptions) {
  const tools = useMemo(() => createOpenApiTools(), []);
  const chat = useChat({
    greeting:
      "Hi! I'm your OpenAPI assistant. I can help edit your spec, add endpoints, validate it, or answer API design questions. What would you like to do?",
    tools,
    generateResponse: openApiResponseGenerator,
    context: { specContent },
    onToolSideEffect: (_, sideEffect) => {
      if (typeof sideEffect === 'string') onSpecReplace(sideEffect);
    },
  });

  return {
    ...chat,
    quickActions: QUICK_ACTIONS,
  };
}
