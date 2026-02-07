import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "@/lib/mcpServer";

type Session = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createMcpServer>;
};

const sessions = new Map<string, Session>();

export const config = {
  api: {
    bodyParser: false
  }
};

const setCors = (res: NextApiResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, last-event-id, mcp-protocol-version");
};

const readRequestBody = async (req: NextApiRequest): Promise<any | undefined> => {
  if (req.method !== "POST") return undefined;
  if (req.body) return req.body;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return undefined;

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }

  return raw;
};

const getSessionId = (req: NextApiRequest): string | undefined => {
  const header = req.headers["mcp-session-id"];
  if (!header) return undefined;
  return Array.isArray(header) ? header[0] : header;
};

const hasInitialize = (body: any): boolean => {
  if (!body) return false;
  if (Array.isArray(body)) return body.some((msg) => isInitializeRequest(msg));
  return isInitializeRequest(body);
};

const getOrCreateSession = async (
  req: NextApiRequest,
  body: any
): Promise<Session> => {
  const sessionId = getSessionId(req);
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  if (!hasInitialize(body)) {
    throw new Error("Server not initialized. Send an initialize request first.");
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  await server.connect(transport);

  if (!transport.sessionId) {
    throw new Error("Failed to create MCP session.");
  }

  const session: Session = { server, transport };
  sessions.set(transport.sessionId, session);

  transport.onclose = () => {
    sessions.delete(transport.sessionId!);
  };

  return session;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const body = await readRequestBody(req);
    const session = await getOrCreateSession(req, body);
    await session.transport.handleRequest(req, res, body);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Unexpected MCP server error" });
  }
}
