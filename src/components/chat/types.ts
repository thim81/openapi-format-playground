/* ------------------------------------------------------------------ */
/*  Standalone Chat Types                                              */
/* ------------------------------------------------------------------ */

/** A single tool call made by the assistant */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'running' | 'done' | 'error';
}

/** A clickable action the assistant can suggest after a response */
export interface AnswerAction {
  label: string;
  /** If set, clicking sends this as a new user message */
  prompt?: string;
  /** If set, clicking executes custom logic instead */
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
}

/** A single chat message */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  actions?: AnswerAction[];
  timestamp: Date;
}

/** Result of executing a tool */
export interface ToolResult {
  result: string;
  /** If the tool modifies external state (e.g. a spec), return it here */
  sideEffect?: unknown;
}

/** A pluggable tool definition */
export interface ToolDefinition {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>, context: ChatContext) => Promise<ToolResult>;
}

/** Context passed to tools and the response generator */
export interface ChatContext {
  [key: string]: unknown;
}

/** Mock response shape returned by the response generator */
export interface GeneratedResponse {
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown> }[];
  actions?: AnswerAction[];
}

/** Function signature for the pluggable response generator */
export type ResponseGenerator = (
  userMessage: string,
  history: ChatMessage[],
  context: ChatContext,
) => GeneratedResponse | Promise<GeneratedResponse>;

/** Configuration for the useChat hook */
export interface UseChatConfig {
  /** Initial greeting message */
  greeting?: string;
  /** Pluggable tool definitions */
  tools?: ToolDefinition[];
  /** Function to generate mock/real responses */
  generateResponse: ResponseGenerator;
  /** Arbitrary context passed to tools and the generator */
  context?: ChatContext;
  /** Called when a tool produces a side effect */
  onToolSideEffect?: (toolName: string, sideEffect: unknown) => void;
}
