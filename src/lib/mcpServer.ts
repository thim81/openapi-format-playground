import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FormatConfig, formatOpenApi } from "./mcpServerFormat";
import { generateShareUrl, parseConfigInput } from "./mcpServerShare";
import { parseString, stringify } from "openapi-format";

const topicSchema = z.enum([
  "basic",
  "filters",
  "sort",
  "overlay",
  "generate",
  "casing",
  "convert"
]);

const configSetSchema = z.union([z.string(), z.record(z.string(), z.unknown())]);

const formatConfigObjectSchema = z
  .object({
    sort: z.boolean().optional(),
    keepComments: z.boolean().optional(),
    filterSet: configSetSchema.optional(),
    sortSet: configSetSchema.optional(),
    generateSet: configSetSchema.optional(),
    casingSet: configSetSchema.optional(),
    overlaySet: configSetSchema.optional(),
    format: z.string().optional(),
    convertVersion: z.enum(["3.1", "3.2"]).optional(),
    resolveExtendsOnly: z.boolean().optional()
  })
  .strict();

const shareConfigObjectSchema = z
  .object({
    sort: z.boolean().optional(),
    keepComments: z.boolean().optional(),
    filterSet: configSetSchema.optional(),
    sortSet: configSetSchema.optional(),
    overlaySet: configSetSchema.optional(),
    generateSet: configSetSchema.optional(),
    casingSet: configSetSchema.optional(),
    format: z.string().optional(),
    convertVersion: z.enum(["3.1", "3.2"]).optional(),
    isFilterOptionsCollapsed: z.boolean().optional(),
    outputLanguage: z.enum(["json", "yaml"]).optional(),
    pathSort: z.enum(["original", "path", "tags"]).optional(),
    defaultFieldSorting: z.boolean().optional()
  })
  .strict();

const formatConfigInputSchema = z.union([z.string(), formatConfigObjectSchema]);
const shareConfigInputSchema = z.union([z.string(), shareConfigObjectSchema]);

const parseFormatConfigInput = async (
  config?: z.infer<typeof formatConfigInputSchema>
): Promise<FormatConfig | undefined> => {
  if (!config) return undefined;
  if (typeof config === "string") {
    return (await parseString(config)) as FormatConfig;
  }
  return config as FormatConfig;
};

const guideText = (topic?: string): string => {
  const base = `# openapi-format MCP Server\n\nThis MCP server exposes tools that wrap openapi-format operations. You can pass config objects as JSON or YAML strings.\n\n**Supported formats**\n- OpenAPI input: JSON or YAML\n- Config input: JSON or YAML\n\n**Endpoint**\n- https://<your-vercel-domain>/api/mcp\n`;

  const sections: Record<string, string> = {
    basic: `## Basic usage\n- Use \`format_openapi\` with an OpenAPI document and optional config.\n- Use \`generate_config_yaml\` to turn config objects into YAML.\n`,
    filters: `## Filters\n- Pass \`filterSet\` with \`methods\`, \`tags\`, \`operationIds\`, or \`unusedComponents\`.\n- Use \`preserveEmptyObjects\` to keep empty objects.\n`,
    sort: `## Sorting\n- Enable \`sort\` and optionally pass \`sortSet\`.\n- Use \`sortSet.sortPathsBy\` for path/tag sorting.\n`,
    overlay: `## Overlay\n- Provide \`overlaySet\` with OpenAPI Overlay actions.\n- Overlays can include \`extends\` to fetch a base spec.\n`,
    generate: `## Generate\n- Provide \`generateSet\` to generate operationIds.\n`,
    casing: `## Casing\n- Provide \`casingSet\` to change casing of operationIds and components.\n`,
    convert: `## Convert\n- Use \`convert_openapi_version\` or \`format_openapi\` with \`convertVersion\`.\n`
  };

  if (!topic) return base + "\n" + Object.values(sections).join("\n");
  return base + "\n" + (sections[topic] || sections.basic);
};

export const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: "openapi-format-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "generate_config_yaml",
    {
      description: "Generate openapi-format configuration in YAML from object or JSON/YAML string input.",
      inputSchema: {
        config: z.union([z.string(), formatConfigObjectSchema, shareConfigObjectSchema]),
        format: z.string().optional()
      },
      outputSchema: {
        yaml: z.string()
      }
    },
    async ({ config, format }) => {
      const parsed = typeof config === "string" ? await parseString(config) : config;
      const yaml = await stringify(parsed as any, { format: format || "yaml" });
      return {
        content: [{ type: "text", text: "Generated YAML configuration." }],
        structuredContent: { yaml }
      };
    }
  );

  server.registerTool(
    "format_openapi",
    {
      description: "Apply openapi-format operations to an OpenAPI document (filter, overlay, sort, casing, convert).",
      inputSchema: {
        openapi: z.string(),
        config: formatConfigInputSchema.optional()
      },
      outputSchema: {
        data: z.string(),
        resultData: z.record(z.string(), z.unknown()).optional()
      }
    },
    async ({ openapi, config }) => {
      const parsedConfig = await parseFormatConfigInput(config);
      const result = await formatOpenApi(openapi, parsedConfig);
      return {
        content: [{ type: "text", text: "OpenAPI formatting completed." }],
        structuredContent: {
          data: result.data as string,
          ...(result.resultData ? { resultData: result.resultData as Record<string, unknown> } : {})
        }
      };
    }
  );

  server.registerTool(
    "convert_openapi_version",
    {
      description: "Convert OpenAPI version to 3.1 or 3.2 and return formatted output.",
      inputSchema: {
        openapi: z.string(),
        convertTo: z.enum(["3.1", "3.2"])
      },
      outputSchema: {
        data: z.string(),
        resultData: z.record(z.string(), z.unknown()).optional()
      }
    },
    async ({ openapi, convertTo }) => {
      const result = await formatOpenApi(openapi, { convertVersion: convertTo });
      return {
        content: [{ type: "text", text: `Converted OpenAPI document to ${convertTo}.` }],
        structuredContent: {
          data: result.data as string,
          ...(result.resultData ? { resultData: result.resultData as Record<string, unknown> } : {})
        }
      };
    }
  );

  server.registerTool(
    "guide_openapi_format_config",
    {
      description: "Return usage guidance for openapi-format configuration topics.",
      inputSchema: {
        topic: topicSchema.optional()
      },
      outputSchema: {
        guidance: z.string(),
        topic: topicSchema.optional()
      }
    },
    async ({ topic }) => {
      const guidance = guideText(topic);
      return {
        content: [{ type: "text", text: guidance }],
        structuredContent: {
          guidance,
          ...(topic ? { topic } : {})
        }
      };
    }
  );

  server.registerTool(
    "share_openapi_format_link",
    {
      description: "Generate a share URL for the OpenAPI Format Playground.",
      inputSchema: {
        openapi: z.string().optional(),
        config: shareConfigInputSchema.optional(),
        origin: z.string().optional()
      },
      outputSchema: {
        url: z.string()
      }
    },
    async ({ openapi, config, origin }) => {
      const base = origin || process.env.OPENAPI_FORMAT_PLAYGROUND_URL || "https://openapi-format-playground.vercel.app";
      const parsedConfig = await parseConfigInput(config);
      const url = await generateShareUrl(base, openapi, parsedConfig);
      return {
        content: [{ type: "text", text: "Generated share link." }],
        structuredContent: { url }
      };
    }
  );

  return server;
};
