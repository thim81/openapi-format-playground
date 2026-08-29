import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Info,
  Globe,
  GitBranch,
  Box,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Server,
  Tag,
  Shield,
  Hash,
  List,
  ToggleLeft,
  Link,
  Key,
  Lock,
  Settings2,
  Database,
  Webhook,
  X,
} from 'lucide-react';
import { parseString, stringify } from 'openapi-format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OpenApiInfo {
  title?: string;
  version?: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name?: string; url?: string };
  extensions?: Record<string, string>;
}

interface OpenApiServer {
  url: string;
  description?: string;
}

interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: { type?: string; format?: string };
}

interface InlineSchema {
  type?: string;
  properties: SchemaProperty[];
}

interface OpenApiResponse {
  statusCode: string;
  description: string;
  contentType?: string;
  schemaRef?: string;
  inlineSchema?: InlineSchema;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  responses?: OpenApiResponse[];
  requestBody?: {
    description?: string;
    required?: boolean;
    contentType?: string;
    schemaRef?: string;
    inlineSchema?: InlineSchema;
  };
  security?: { name: string; scopes: string[] }[];
  extensions?: Record<string, string>;
}

interface OpenApiPath {
  path: string;
  operations: Record<string, OpenApiOperation>;
  extensions?: Record<string, string>;
}

interface SchemaProperty {
  name: string;
  type: string;
  format?: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  $ref?: string;
  nullable?: boolean;
  example?: string;
  default?: string;
  items?: { type?: string; $ref?: string };
  extensions?: Record<string, string>;
  properties?: SchemaProperty[];
}

interface CompositionRef {
  $ref?: string;
  inlineSchema?: InlineSchema;
}

interface SchemaDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

interface SchemaAdditionalProperties {
  enabled: boolean;
  type?: string;
  $ref?: string;
}

interface OpenApiSchema {
  name: string;
  type: string;
  description?: string;
  properties: SchemaProperty[];
  allOf?: CompositionRef[];
  oneOf?: CompositionRef[];
  anyOf?: CompositionRef[];
  discriminator?: SchemaDiscriminator;
  additionalProperties?: SchemaAdditionalProperties;
  extensions?: Record<string, string>;
}

// ─── Phase 3 Types ───────────────────────────────────────────────────────────

interface ComponentParameter {
  name: string; // key in components/parameters
  in: 'query' | 'path' | 'header' | 'cookie';
  paramName: string; // the actual parameter name
  description?: string;
  required?: boolean;
  schema?: { type?: string; format?: string };
}

interface ComponentResponse {
  name: string;
  description: string;
  contentType?: string;
  schemaRef?: string;
  inlineSchema?: InlineSchema;
}

type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

interface SecurityScheme {
  name: string;
  type: SecuritySchemeType;
  description?: string;
  // apiKey
  apiKeyIn?: 'query' | 'header' | 'cookie';
  apiKeyName?: string;
  // http
  httpScheme?: string; // bearer, basic, etc.
  bearerFormat?: string;
  // oauth2
  oauth2Flows?: {
    implicit?: { authorizationUrl?: string; scopes?: Record<string, string> };
    clientCredentials?: { tokenUrl?: string; scopes?: Record<string, string> };
    authorizationCode?: {
      authorizationUrl?: string;
      tokenUrl?: string;
      scopes?: Record<string, string>;
    };
  };
  // openIdConnect
  openIdConnectUrl?: string;
}

interface ComponentRequestBody {
  name: string;
  description?: string;
  required?: boolean;
  contentType?: string;
  schemaRef?: string;
  inlineSchema?: InlineSchema;
  extensions?: Record<string, string>;
}

interface ComponentHeader {
  name: string;
  description?: string;
  required?: boolean;
  schema?: { type?: string; format?: string };
  extensions?: Record<string, string>;
}

interface ComponentExample {
  name: string;
  summary?: string;
  description?: string;
  value?: string; // JSON-stringified
  extensions?: Record<string, string>;
}

interface ComponentLink {
  name: string;
  operationId?: string;
  operationRef?: string;
  description?: string;
  parameters?: Record<string, string>;
  extensions?: Record<string, string>;
}

interface ComponentCallback {
  name: string;
  expression: string; // the URL expression key
  operations: Record<string, OpenApiOperation>;
  extensions?: Record<string, string>;
}

interface WebhookEntry {
  name: string;
  description?: string;
  operations: Record<string, OpenApiOperation>;
}

interface OpenApiDoc {
  openapi: string;
  info: OpenApiInfo;
  servers: OpenApiServer[];
  paths: OpenApiPath[];
  schemas: OpenApiSchema[];
  tags: { name: string; description?: string }[];
  componentParameters: ComponentParameter[];
  componentResponses: ComponentResponse[];
  componentRequestBodies: ComponentRequestBody[];
  componentHeaders: ComponentHeader[];
  componentExamples: ComponentExample[];
  componentLinks: ComponentLink[];
  componentCallbacks: ComponentCallback[];
  securitySchemes: SecurityScheme[];
  security: { name: string; scopes: string[] }[];
  webhooks: WebhookEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract x-* extension keys from a raw object into a Record<string, string> */
function extractExtensions(obj: any): Record<string, string> {
  if (!obj || typeof obj !== 'object') return {};
  const ext: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('x-')) {
      const val = obj[key];
      ext[key] = typeof val === 'string' ? val : JSON.stringify(val);
    }
  }
  return ext;
}

/** Merge extensions back into a raw object */
function mergeExtensions(obj: any, extensions?: Record<string, string>): any {
  if (!extensions || Object.keys(extensions).length === 0) return obj;
  const result = { ...obj };
  for (const [key, val] of Object.entries(extensions)) {
    try {
      result[key] = JSON.parse(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

const OPENAPI_VERSIONS = ['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.1.0', '3.1.1', '3.2.0'] as const;

/** Returns true if the spec version is 3.1.0 or later */
function isV31Plus(version: string): boolean {
  const parts = version.split('.').map(Number);
  if (parts[0] !== 3) return false;
  return parts[1] >= 1;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
const PARAM_LOCATIONS = ['query', 'path', 'header', 'cookie'] as const;
const SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object', '$ref'] as const;
const CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
  'text/plain',
] as const;
const SECURITY_SCHEME_TYPES: SecuritySchemeType[] = ['apiKey', 'http', 'oauth2', 'openIdConnect'];
const HTTP_AUTH_SCHEMES = [
  'bearer',
  'basic',
  'digest',
  'hoba',
  'mutual',
  'negotiate',
  'oauth',
  'scram-sha-1',
  'scram-sha-256',
  'vapid',
] as const;

const methodColors: Record<string, string> = {
  get: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  post: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  put: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  patch: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  delete: 'bg-red-500/15 text-red-700 dark:text-red-400',
  options: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  head: 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
};

// Shared property serializer (handles nested objects)
function serializeProp(prop: SchemaProperty, v31?: boolean): any {
  if (prop.$ref) return { $ref: prop.$ref };
  const p: any = { type: prop.type };
  if (prop.format) p.format = prop.format;
  if (prop.description) p.description = prop.description;
  if (prop.enum && prop.enum.length > 0) p.enum = prop.enum;
  if (prop.nullable) {
    if (v31) {
      p.type = [prop.type, 'null'];
    } else {
      p.nullable = true;
    }
  }
  if (prop.example !== undefined && prop.example !== '') p.example = prop.example;
  if (prop.default !== undefined && prop.default !== '') p.default = prop.default;
  if (prop.type === 'array' && prop.items) {
    if (prop.items.$ref) p.items = { $ref: prop.items.$ref };
    else if (prop.items.type) p.items = { type: prop.items.type };
  }
  // Nested object properties
  if (prop.type === 'object' && prop.properties && prop.properties.length > 0) {
    p.properties = {};
    const req: string[] = [];
    for (const sub of prop.properties) {
      p.properties[sub.name] = mergeExtensions(serializeProp(sub, v31), sub.extensions);
      if (sub.required) req.push(sub.name);
    }
    if (req.length > 0) p.required = req;
  }
  return mergeExtensions(p, prop.extensions);
}

// Shared property parser (handles nested objects)
function parseProp(pName: string, p: any, reqFields: string[]): SchemaProperty {
  const items = p.items ? { type: p.items?.type || '', $ref: p.items?.$ref || '' } : undefined;
  const nested: SchemaProperty[] | undefined = p.properties
    ? Object.entries(p.properties).map(([n, sub]: [string, any]) =>
        parseProp(n, sub, p.required || []),
      )
    : undefined;
  return {
    name: pName,
    type: extractType(p),
    format: p.format || '',
    description: p.description || '',
    required: reqFields.includes(pName),
    enum: p.enum || [],
    $ref: p.$ref || '',
    nullable: detectNullable(p),
    example: p.example !== undefined ? String(p.example) : '',
    default: p.default !== undefined ? String(p.default) : '',
    items,
    extensions: extractExtensions(p),
    properties: nested,
  };
}

// Inline schema serialization helpers
function serializeInlineSchema(schema: InlineSchema, v31?: boolean): any {
  const s: any = { type: schema.type || 'object' };
  if (schema.properties.length > 0) {
    s.properties = {};
    const required: string[] = [];
    for (const prop of schema.properties) {
      s.properties[prop.name] = serializeProp(prop, v31);
      if (prop.required) required.push(prop.name);
    }
    if (required.length > 0) s.required = required;
  }
  return s;
}

/** Detect nullable from either 3.0 (nullable: true) or 3.1+ (type: ['string', 'null']) */
function detectNullable(p: any): boolean {
  if (p.nullable) return true;
  if (Array.isArray(p.type) && p.type.includes('null')) return true;
  return false;
}

/** Extract the primary type from 3.1+ type arrays */
function extractType(p: any): string {
  if (p.$ref) return '$ref';
  if (Array.isArray(p.type)) {
    const nonNull = p.type.filter((t: string) => t !== 'null');
    return nonNull[0] || 'string';
  }
  return p.type || 'string';
}

function parseInlineSchema(raw: any): InlineSchema {
  const reqFields = raw?.required || [];
  return {
    type: raw?.type || 'object',
    properties: raw?.properties
      ? Object.entries(raw.properties).map(([pName, p]: [string, any]) =>
          parseProp(pName, p, reqFields),
        )
      : [],
  };
}

function docToRaw(doc: OpenApiDoc): any {
  const raw: any = { openapi: doc.openapi || '3.0.3' };
  const v31 = isV31Plus(doc.openapi);

  // Info
  const info: any = { title: doc.info.title || '', version: doc.info.version || '' };
  if (doc.info.description) info.description = doc.info.description;
  if (doc.info.termsOfService) info.termsOfService = doc.info.termsOfService;
  if (doc.info.contact && Object.values(doc.info.contact).some(Boolean))
    info.contact = doc.info.contact;
  if (doc.info.license && doc.info.license.name) info.license = doc.info.license;
  raw.info = mergeExtensions(info, doc.info.extensions);

  // Servers
  if (doc.servers.length > 0) {
    raw.servers = doc.servers.map((s) => {
      const srv: any = { url: s.url };
      if (s.description) srv.description = s.description;
      return srv;
    });
  }

  // Tags
  if (doc.tags.length > 0) {
    raw.tags = doc.tags.map((t) => {
      const tag: any = { name: t.name };
      if (t.description) tag.description = t.description;
      return tag;
    });
  }

  // Global security
  if (doc.security && doc.security.length > 0) {
    raw.security = doc.security.map((s) => ({ [s.name]: s.scopes }));
  }

  // Paths
  if (doc.paths.length > 0) {
    raw.paths = {};
    for (const p of doc.paths) {
      const pathItem: any = {};
      for (const [method, op] of Object.entries(p.operations)) {
        const rawOp: any = {};
        if (op.operationId) rawOp.operationId = op.operationId;
        if (op.summary) rawOp.summary = op.summary;
        if (op.description) rawOp.description = op.description;
        if (op.tags && op.tags.length > 0) rawOp.tags = op.tags;
        if (op.parameters && op.parameters.length > 0) {
          rawOp.parameters = op.parameters.map((param) => {
            const rp: any = { name: param.name, in: param.in };
            if (param.description) rp.description = param.description;
            if (param.required) rp.required = true;
            if (param.schema?.type)
              rp.schema = {
                type: param.schema.type,
                ...(param.schema.format ? { format: param.schema.format } : {}),
              };
            return rp;
          });
        }
        if (op.requestBody) {
          const rb: any = {};
          if (op.requestBody.description) rb.description = op.requestBody.description;
          if (op.requestBody.required) rb.required = true;
          const ct = op.requestBody.contentType || 'application/json';
          if (op.requestBody.schemaRef) {
            rb.content = { [ct]: { schema: { $ref: op.requestBody.schemaRef } } };
          } else if (
            op.requestBody.inlineSchema &&
            op.requestBody.inlineSchema.properties.length > 0
          ) {
            rb.content = {
              [ct]: { schema: serializeInlineSchema(op.requestBody.inlineSchema, v31) },
            };
          } else {
            rb.content = { [ct]: { schema: {} } };
          }
          rawOp.requestBody = rb;
        }
        if (op.responses && op.responses.length > 0) {
          rawOp.responses = {};
          for (const r of op.responses) {
            const respObj: any = { description: r.description };
            if (r.schemaRef) {
              const ct = r.contentType || 'application/json';
              respObj.content = { [ct]: { schema: { $ref: r.schemaRef } } };
            } else if (r.inlineSchema && r.inlineSchema.properties.length > 0) {
              const ct = r.contentType || 'application/json';
              respObj.content = { [ct]: { schema: serializeInlineSchema(r.inlineSchema, v31) } };
            }
            rawOp.responses[r.statusCode] = respObj;
          }
        }
        if (op.security && op.security.length > 0) {
          rawOp.security = op.security.map((s) => ({ [s.name]: s.scopes }));
        }
        pathItem[method] = mergeExtensions(rawOp, op.extensions);
      }
      raw.paths[p.path] = mergeExtensions(pathItem, p.extensions);
    }
  }

  // Components
  const hasSchemas = doc.schemas.length > 0;
  const hasParams = doc.componentParameters.length > 0;
  const hasResponses = doc.componentResponses.length > 0;
  const hasRequestBodies = doc.componentRequestBodies.length > 0;
  const hasHeaders = doc.componentHeaders.length > 0;
  const hasExamples = doc.componentExamples.length > 0;
  const hasLinks = doc.componentLinks.length > 0;
  const hasCallbacks = doc.componentCallbacks.length > 0;
  const hasSecurity = doc.securitySchemes.length > 0;

  if (
    hasSchemas ||
    hasParams ||
    hasResponses ||
    hasRequestBodies ||
    hasHeaders ||
    hasExamples ||
    hasLinks ||
    hasCallbacks ||
    hasSecurity
  ) {
    if (!raw.components) raw.components = {};

    // Schemas
    if (hasSchemas) {
      raw.components.schemas = {};
      for (const schema of doc.schemas) {
        const s: any = { type: schema.type };
        if (schema.description) s.description = schema.description;
        if (schema.properties.length > 0) {
          s.properties = {};
          const required: string[] = [];
          for (const prop of schema.properties) {
            s.properties[prop.name] = serializeProp(prop, v31);
            if (prop.required) required.push(prop.name);
          }
          if (required.length > 0) s.required = required;
        }
        // Composition keywords
        const serializeCompositionRefs = (refs: CompositionRef[] | undefined) =>
          refs
            ?.filter((r) => r.$ref || (r.inlineSchema && r.inlineSchema.properties.length > 0))
            .map((r) => (r.$ref ? { $ref: r.$ref } : serializeInlineSchema(r.inlineSchema!, v31)));
        const allOfRaw = serializeCompositionRefs(schema.allOf);
        if (allOfRaw && allOfRaw.length > 0) s.allOf = allOfRaw;
        const oneOfRaw = serializeCompositionRefs(schema.oneOf);
        if (oneOfRaw && oneOfRaw.length > 0) s.oneOf = oneOfRaw;
        const anyOfRaw = serializeCompositionRefs(schema.anyOf);
        if (anyOfRaw && anyOfRaw.length > 0) s.anyOf = anyOfRaw;

        // Discriminator
        if (schema.discriminator?.propertyName) {
          s.discriminator = { propertyName: schema.discriminator.propertyName };
          if (
            schema.discriminator.mapping &&
            Object.keys(schema.discriminator.mapping).length > 0
          ) {
            s.discriminator.mapping = schema.discriminator.mapping;
          }
        }

        // additionalProperties
        if (schema.additionalProperties?.enabled) {
          if (schema.additionalProperties.$ref) {
            s.additionalProperties = { $ref: schema.additionalProperties.$ref };
          } else if (
            schema.additionalProperties.type &&
            schema.additionalProperties.type !== 'true'
          ) {
            s.additionalProperties = { type: schema.additionalProperties.type };
          } else {
            s.additionalProperties = true;
          }
        } else if (schema.additionalProperties && !schema.additionalProperties.enabled) {
          s.additionalProperties = false;
        }

        raw.components.schemas[schema.name] = mergeExtensions(s, schema.extensions);
      }
    }

    // Component Parameters
    if (hasParams) {
      raw.components.parameters = {};
      for (const cp of doc.componentParameters) {
        const p: any = { name: cp.paramName || cp.name, in: cp.in };
        if (cp.description) p.description = cp.description;
        if (cp.required) p.required = true;
        if (cp.schema?.type)
          p.schema = {
            type: cp.schema.type,
            ...(cp.schema.format ? { format: cp.schema.format } : {}),
          };
        raw.components.parameters[cp.name] = p;
      }
    }

    // Component Responses
    if (hasResponses) {
      raw.components.responses = {};
      for (const cr of doc.componentResponses) {
        const r: any = { description: cr.description };
        if (cr.schemaRef) {
          const ct = cr.contentType || 'application/json';
          r.content = { [ct]: { schema: { $ref: cr.schemaRef } } };
        } else if (cr.inlineSchema && cr.inlineSchema.properties.length > 0) {
          const ct = cr.contentType || 'application/json';
          r.content = { [ct]: { schema: serializeInlineSchema(cr.inlineSchema, v31) } };
        }
        raw.components.responses[cr.name] = r;
      }
    }

    // Component Request Bodies
    if (hasRequestBodies) {
      raw.components.requestBodies = {};
      for (const rb of doc.componentRequestBodies) {
        const r: any = {};
        if (rb.description) r.description = rb.description;
        if (rb.required) r.required = true;
        const ct = rb.contentType || 'application/json';
        if (rb.schemaRef) {
          r.content = { [ct]: { schema: { $ref: rb.schemaRef } } };
        } else if (rb.inlineSchema && rb.inlineSchema.properties.length > 0) {
          r.content = { [ct]: { schema: serializeInlineSchema(rb.inlineSchema, v31) } };
        } else {
          r.content = { [ct]: { schema: {} } };
        }
        raw.components.requestBodies[rb.name] = mergeExtensions(r, rb.extensions);
      }
    }

    // Component Headers
    if (hasHeaders) {
      raw.components.headers = {};
      for (const ch of doc.componentHeaders) {
        const h: any = {};
        if (ch.description) h.description = ch.description;
        if (ch.required) h.required = true;
        if (ch.schema?.type)
          h.schema = {
            type: ch.schema.type,
            ...(ch.schema.format ? { format: ch.schema.format } : {}),
          };
        raw.components.headers[ch.name] = mergeExtensions(h, ch.extensions);
      }
    }

    // Component Examples
    if (hasExamples) {
      raw.components.examples = {};
      for (const ex of doc.componentExamples) {
        const e: any = {};
        if (ex.summary) e.summary = ex.summary;
        if (ex.description) e.description = ex.description;
        if (ex.value !== undefined && ex.value !== '') {
          try {
            e.value = JSON.parse(ex.value);
          } catch {
            e.value = ex.value;
          }
        }
        raw.components.examples[ex.name] = mergeExtensions(e, ex.extensions);
      }
    }

    // Component Links
    if (hasLinks) {
      raw.components.links = {};
      for (const lk of doc.componentLinks) {
        const l: any = {};
        if (lk.operationId) l.operationId = lk.operationId;
        if (lk.operationRef) l.operationRef = lk.operationRef;
        if (lk.description) l.description = lk.description;
        if (lk.parameters && Object.keys(lk.parameters).length > 0) l.parameters = lk.parameters;
        raw.components.links[lk.name] = mergeExtensions(l, lk.extensions);
      }
    }

    // Component Callbacks
    if (hasCallbacks) {
      raw.components.callbacks = {};
      for (const cb of doc.componentCallbacks) {
        const callbackItem: any = {};
        const pathItem: any = {};
        for (const [method, op] of Object.entries(cb.operations)) {
          const rawOp: any = {};
          if (op.operationId) rawOp.operationId = op.operationId;
          if (op.summary) rawOp.summary = op.summary;
          if (op.description) rawOp.description = op.description;
          if (op.requestBody) {
            const rb: any = {};
            if (op.requestBody.description) rb.description = op.requestBody.description;
            if (op.requestBody.required) rb.required = true;
            const ct = op.requestBody.contentType || 'application/json';
            if (op.requestBody.schemaRef) {
              rb.content = { [ct]: { schema: { $ref: op.requestBody.schemaRef } } };
            }
            rawOp.requestBody = rb;
          }
          if (op.responses && op.responses.length > 0) {
            rawOp.responses = {};
            for (const r of op.responses) {
              rawOp.responses[r.statusCode] = { description: r.description };
            }
          }
          pathItem[method] = rawOp;
        }
        callbackItem[cb.expression] = pathItem;
        raw.components.callbacks[cb.name] = mergeExtensions(callbackItem, cb.extensions);
      }
    }

    // Security Schemes
    if (hasSecurity) {
      raw.components.securitySchemes = {};
      for (const ss of doc.securitySchemes) {
        const scheme: any = { type: ss.type };
        if (ss.description) scheme.description = ss.description;
        if (ss.type === 'apiKey') {
          scheme.in = ss.apiKeyIn || 'header';
          scheme.name = ss.apiKeyName || '';
        }
        if (ss.type === 'http') {
          scheme.scheme = ss.httpScheme || 'bearer';
          if (ss.bearerFormat) scheme.bearerFormat = ss.bearerFormat;
        }
        if (ss.type === 'oauth2' && ss.oauth2Flows) {
          scheme.flows = {};
          if (ss.oauth2Flows.implicit) {
            scheme.flows.implicit = {
              authorizationUrl: ss.oauth2Flows.implicit.authorizationUrl || '',
              scopes: ss.oauth2Flows.implicit.scopes || {},
            };
          }
          if (ss.oauth2Flows.clientCredentials) {
            scheme.flows.clientCredentials = {
              tokenUrl: ss.oauth2Flows.clientCredentials.tokenUrl || '',
              scopes: ss.oauth2Flows.clientCredentials.scopes || {},
            };
          }
          if (ss.oauth2Flows.authorizationCode) {
            scheme.flows.authorizationCode = {
              authorizationUrl: ss.oauth2Flows.authorizationCode.authorizationUrl || '',
              tokenUrl: ss.oauth2Flows.authorizationCode.tokenUrl || '',
              scopes: ss.oauth2Flows.authorizationCode.scopes || {},
            };
          }
        }
        if (ss.type === 'openIdConnect') {
          scheme.openIdConnectUrl = ss.openIdConnectUrl || '';
        }
        raw.components.securitySchemes[ss.name] = scheme;
      }
    }
  }

  // Webhooks (3.1+)
  if (v31 && doc.webhooks.length > 0) {
    raw.webhooks = {};
    for (const wh of doc.webhooks) {
      raw.webhooks[wh.name] = {};
      for (const [method, op] of Object.entries(wh.operations)) {
        const rawOp: any = {};
        if (op.operationId) rawOp.operationId = op.operationId;
        if (op.summary) rawOp.summary = op.summary;
        if (op.description) rawOp.description = op.description;
        if (op.tags && op.tags.length > 0) rawOp.tags = op.tags;
        if (op.requestBody) {
          const rb: any = {};
          if (op.requestBody.description) rb.description = op.requestBody.description;
          if (op.requestBody.required) rb.required = true;
          const ct = op.requestBody.contentType || 'application/json';
          if (op.requestBody.schemaRef) {
            rb.content = { [ct]: { schema: { $ref: op.requestBody.schemaRef } } };
          } else if (
            op.requestBody.inlineSchema &&
            op.requestBody.inlineSchema.properties.length > 0
          ) {
            rb.content = {
              [ct]: { schema: serializeInlineSchema(op.requestBody.inlineSchema, v31) },
            };
          }
          rawOp.requestBody = rb;
        }
        if (op.responses && op.responses.length > 0) {
          rawOp.responses = {};
          for (const r of op.responses) {
            rawOp.responses[r.statusCode] = { description: r.description };
          }
        }
        raw.webhooks[wh.name][method] = rawOp;
      }
    }
  }

  return raw;
}

function rawToDoc(raw: any): OpenApiDoc {
  const doc: OpenApiDoc = {
    openapi: raw?.openapi || '3.0.3',
    info: {
      title: raw?.info?.title || '',
      version: raw?.info?.version || '',
      description: raw?.info?.description || '',
      termsOfService: raw?.info?.termsOfService || '',
      contact: raw?.info?.contact || {},
      license: raw?.info?.license || {},
      extensions: extractExtensions(raw?.info),
    },
    servers: (raw?.servers || []).map((s: any) => ({
      url: s.url || '',
      description: s.description || '',
    })),
    tags: (raw?.tags || []).map((t: any) => ({
      name: t.name || '',
      description: t.description || '',
    })),
    paths: [],
    schemas: [],
    componentParameters: [],
    componentResponses: [],
    componentRequestBodies: [],
    componentHeaders: [],
    componentExamples: [],
    componentLinks: [],
    componentCallbacks: [],
    securitySchemes: [],
    security: (raw?.security || []).map((s: any) => {
      const name = Object.keys(s)[0] || '';
      return { name, scopes: s[name] || [] };
    }),
    webhooks: [],
  };

  const v31 = isV31Plus(doc.openapi);

  // Paths
  if (raw?.paths) {
    for (const [pathStr, methods] of Object.entries(raw.paths as Record<string, any>)) {
      const path: OpenApiPath = {
        path: pathStr,
        operations: {},
        extensions: extractExtensions(methods),
      };
      for (const [method, op] of Object.entries(methods as Record<string, any>)) {
        if (!HTTP_METHODS.includes(method as any)) continue;
        const operation: OpenApiOperation = {
          operationId: op.operationId || '',
          summary: op.summary || '',
          description: op.description || '',
          tags: op.tags || [],
          parameters: (op.parameters || []).map((p: any) => ({
            name: p.name || '',
            in: p.in || 'query',
            description: p.description || '',
            required: !!p.required,
            schema: { type: p.schema?.type || 'string', format: p.schema?.format || '' },
          })),
          responses: op.responses
            ? Object.entries(op.responses).map(([code, r]: [string, any]) => {
                const contentTypes = Object.keys(r.content || {});
                const ct = contentTypes[0] || '';
                const schemaRef =
                  ct && r.content?.[ct]?.schema?.$ref ? r.content[ct].schema.$ref : '';
                const schemaObj = ct && r.content?.[ct]?.schema;
                const inlineSchema =
                  schemaObj && !schemaRef && schemaObj.properties
                    ? parseInlineSchema(schemaObj)
                    : undefined;
                return {
                  statusCode: code,
                  description: r.description || '',
                  contentType: ct || undefined,
                  schemaRef: schemaRef || undefined,
                  inlineSchema,
                };
              })
            : [],
          security: (op.security || []).map((s: any) => {
            const name = Object.keys(s)[0] || '';
            return { name, scopes: s[name] || [] };
          }),
          extensions: extractExtensions(op),
        };
        if (op.requestBody) {
          const contentTypes = Object.keys(op.requestBody.content || {});
          const ct = contentTypes[0] || 'application/json';
          const schemaRef = op.requestBody.content?.[ct]?.schema?.$ref || '';
          const schemaObj = op.requestBody.content?.[ct]?.schema;
          const inlineSchema =
            schemaObj && !schemaRef && schemaObj.properties
              ? parseInlineSchema(schemaObj)
              : undefined;
          operation.requestBody = {
            description: op.requestBody.description || '',
            required: !!op.requestBody.required,
            contentType: ct,
            schemaRef: schemaRef || undefined,
            inlineSchema,
          };
        }
        path.operations[method] = operation;
      }
      doc.paths.push(path);
    }
  }

  // Schemas
  if (raw?.components?.schemas) {
    const requiredFn = (schemaObj: any) => schemaObj?.required || [];
    for (const [name, schema] of Object.entries(raw.components.schemas as Record<string, any>)) {
      const reqFields = requiredFn(schema);
      const parseCompositionRefs = (arr: any[]): CompositionRef[] =>
        (arr || []).map((r: any) => {
          if (r.$ref) return { $ref: r.$ref };
          if (r.properties || r.type) return { inlineSchema: parseInlineSchema(r) };
          return { $ref: '' };
        });

      const parsedSchema: OpenApiSchema = {
        name,
        type: schema.type || 'object',
        description: schema.description || '',
        properties: schema.properties
          ? Object.entries(schema.properties).map(([pName, p]: [string, any]) =>
              parseProp(pName, p, reqFields),
            )
          : [],
      };

      if (schema.allOf) parsedSchema.allOf = parseCompositionRefs(schema.allOf);
      if (schema.oneOf) parsedSchema.oneOf = parseCompositionRefs(schema.oneOf);
      if (schema.anyOf) parsedSchema.anyOf = parseCompositionRefs(schema.anyOf);

      if (schema.discriminator) {
        parsedSchema.discriminator = {
          propertyName: schema.discriminator.propertyName || '',
          mapping: schema.discriminator.mapping || {},
        };
      }

      if (schema.additionalProperties !== undefined) {
        if (schema.additionalProperties === true) {
          parsedSchema.additionalProperties = { enabled: true };
        } else if (schema.additionalProperties === false) {
          parsedSchema.additionalProperties = { enabled: false };
        } else if (typeof schema.additionalProperties === 'object') {
          parsedSchema.additionalProperties = {
            enabled: true,
            type: schema.additionalProperties.type || '',
            $ref: schema.additionalProperties.$ref || '',
          };
        }
      }

      parsedSchema.extensions = extractExtensions(schema);

      doc.schemas.push(parsedSchema);
    }
  }

  // Component Parameters
  if (raw?.components?.parameters) {
    for (const [name, p] of Object.entries(raw.components.parameters as Record<string, any>)) {
      doc.componentParameters.push({
        name,
        paramName: p.name || name,
        in: p.in || 'query',
        description: p.description || '',
        required: !!p.required,
        schema: { type: p.schema?.type || 'string', format: p.schema?.format || '' },
      });
    }
  }

  // Component Responses
  if (raw?.components?.responses) {
    for (const [name, r] of Object.entries(raw.components.responses as Record<string, any>)) {
      const contentTypes = Object.keys(r.content || {});
      const ct = contentTypes[0] || '';
      const schemaRef = ct && r.content?.[ct]?.schema?.$ref ? r.content[ct].schema.$ref : '';
      const schemaObj = ct && r.content?.[ct]?.schema;
      const inlineSchema =
        schemaObj && !schemaRef && schemaObj.properties ? parseInlineSchema(schemaObj) : undefined;
      doc.componentResponses.push({
        name,
        description: r.description || '',
        contentType: ct || undefined,
        schemaRef: schemaRef || undefined,
        inlineSchema,
      });
    }
  }

  // Component Request Bodies
  if (raw?.components?.requestBodies) {
    for (const [name, rb] of Object.entries(raw.components.requestBodies as Record<string, any>)) {
      const contentTypes = Object.keys(rb.content || {});
      const ct = contentTypes[0] || 'application/json';
      const schemaRef = ct && rb.content?.[ct]?.schema?.$ref ? rb.content[ct].schema.$ref : '';
      const schemaObj = ct && rb.content?.[ct]?.schema;
      const inlineSchema =
        schemaObj && !schemaRef && schemaObj.properties ? parseInlineSchema(schemaObj) : undefined;
      doc.componentRequestBodies.push({
        name,
        description: rb.description || '',
        required: !!rb.required,
        contentType: ct || undefined,
        schemaRef: schemaRef || undefined,
        inlineSchema,
        extensions: extractExtensions(rb),
      });
    }
  }

  // Component Headers
  if (raw?.components?.headers) {
    for (const [name, h] of Object.entries(raw.components.headers as Record<string, any>)) {
      doc.componentHeaders.push({
        name,
        description: h.description || '',
        required: !!h.required,
        schema: { type: h.schema?.type || 'string', format: h.schema?.format || '' },
        extensions: extractExtensions(h),
      });
    }
  }

  // Component Examples
  if (raw?.components?.examples) {
    for (const [name, ex] of Object.entries(raw.components.examples as Record<string, any>)) {
      doc.componentExamples.push({
        name,
        summary: ex.summary || '',
        description: ex.description || '',
        value:
          ex.value !== undefined
            ? typeof ex.value === 'string'
              ? ex.value
              : JSON.stringify(ex.value, null, 2)
            : '',
        extensions: extractExtensions(ex),
      });
    }
  }

  // Component Links
  if (raw?.components?.links) {
    for (const [name, lk] of Object.entries(raw.components.links as Record<string, any>)) {
      doc.componentLinks.push({
        name,
        operationId: lk.operationId || '',
        operationRef: lk.operationRef || '',
        description: lk.description || '',
        parameters: lk.parameters || {},
        extensions: extractExtensions(lk),
      });
    }
  }

  // Component Callbacks
  if (raw?.components?.callbacks) {
    for (const [name, cb] of Object.entries(raw.components.callbacks as Record<string, any>)) {
      const expressions = Object.entries(cb as Record<string, any>);
      if (expressions.length === 0) continue;
      const [expression, pathItem] = expressions[0];
      const callback: ComponentCallback = {
        name,
        expression,
        operations: {},
        extensions: extractExtensions(cb),
      };
      for (const [method, op] of Object.entries(pathItem as Record<string, any>)) {
        if (!HTTP_METHODS.includes(method as any)) continue;
        const operation: OpenApiOperation = {
          operationId: op.operationId || '',
          summary: op.summary || '',
          description: op.description || '',
          tags: op.tags || [],
          parameters: [],
          responses: op.responses
            ? Object.entries(op.responses).map(([code, r]: [string, any]) => ({
                statusCode: code,
                description: r.description || '',
              }))
            : [],
        };
        if (op.requestBody) {
          const rct = Object.keys(op.requestBody.content || {})[0] || 'application/json';
          const sr = op.requestBody.content?.[rct]?.schema?.$ref || '';
          operation.requestBody = {
            description: op.requestBody.description || '',
            required: !!op.requestBody.required,
            contentType: rct,
            schemaRef: sr || undefined,
          };
        }
        callback.operations[method] = operation;
      }
      doc.componentCallbacks.push(callback);
    }
  }

  // Security Schemes
  if (raw?.components?.securitySchemes) {
    for (const [name, ss] of Object.entries(
      raw.components.securitySchemes as Record<string, any>,
    )) {
      const scheme: SecurityScheme = {
        name,
        type: ss.type || 'apiKey',
        description: ss.description || '',
      };
      if (ss.type === 'apiKey') {
        scheme.apiKeyIn = ss.in || 'header';
        scheme.apiKeyName = ss.name || '';
      }
      if (ss.type === 'http') {
        scheme.httpScheme = ss.scheme || 'bearer';
        scheme.bearerFormat = ss.bearerFormat || '';
      }
      if (ss.type === 'oauth2' && ss.flows) {
        scheme.oauth2Flows = {};
        if (ss.flows.implicit) {
          scheme.oauth2Flows.implicit = {
            authorizationUrl: ss.flows.implicit.authorizationUrl || '',
            scopes: ss.flows.implicit.scopes || {},
          };
        }
        if (ss.flows.clientCredentials) {
          scheme.oauth2Flows.clientCredentials = {
            tokenUrl: ss.flows.clientCredentials.tokenUrl || '',
            scopes: ss.flows.clientCredentials.scopes || {},
          };
        }
        if (ss.flows.authorizationCode) {
          scheme.oauth2Flows.authorizationCode = {
            authorizationUrl: ss.flows.authorizationCode.authorizationUrl || '',
            tokenUrl: ss.flows.authorizationCode.tokenUrl || '',
            scopes: ss.flows.authorizationCode.scopes || {},
          };
        }
      }
      if (ss.type === 'openIdConnect') {
        scheme.openIdConnectUrl = ss.openIdConnectUrl || '';
      }
      doc.securitySchemes.push(scheme);
    }
  }

  // Webhooks (3.1+)
  if (raw?.webhooks) {
    for (const [name, wh] of Object.entries(raw.webhooks as Record<string, any>)) {
      const webhook: WebhookEntry = { name, operations: {} };
      for (const [method, op] of Object.entries(wh as Record<string, any>)) {
        if (!HTTP_METHODS.includes(method as any)) continue;
        const operation: OpenApiOperation = {
          operationId: op.operationId || '',
          summary: op.summary || '',
          description: op.description || '',
          tags: op.tags || [],
          parameters: [],
          responses: op.responses
            ? Object.entries(op.responses).map(([code, r]: [string, any]) => ({
                statusCode: code,
                description: r.description || '',
              }))
            : [],
        };
        if (op.requestBody) {
          const contentTypes = Object.keys(op.requestBody.content || {});
          const ct = contentTypes[0] || 'application/json';
          const schemaRef = op.requestBody.content?.[ct]?.schema?.$ref || '';
          operation.requestBody = {
            description: op.requestBody.description || '',
            required: !!op.requestBody.required,
            contentType: ct,
            schemaRef: schemaRef || undefined,
          };
        }
        webhook.operations[method] = operation;
      }
      doc.webhooks.push(webhook);
    }
  }

  return doc;
}

// ─── Nav Items ───────────────────────────────────────────────────────────────

type NavSection =
  | 'info'
  | 'servers'
  | 'tags'
  | 'security'
  | 'webhooks'
  | `path:${number}`
  | `path:${number}:${string}`
  | `schema:${number}`
  | 'componentParams'
  | `componentParam:${number}`
  | 'componentResponses'
  | `componentResponse:${number}`
  | 'componentRequestBodies'
  | `componentRequestBody:${number}`
  | 'componentHeaders'
  | `componentHeader:${number}`
  | 'componentExamples'
  | `componentExample:${number}`
  | 'componentLinks'
  | `componentLink:${number}`
  | 'componentCallbacks'
  | `componentCallback:${number}`
  | `componentCallback:${number}:${string}`
  | 'securitySchemes'
  | `securityScheme:${number}`
  | `webhook:${number}`
  | `webhook:${number}:${string}`;

// ─── Schema Ref Picker ───────────────────────────────────────────────────────

const SchemaRefPicker: React.FC<{
  value: string;
  onChange: (ref: string) => void;
  schemas: OpenApiSchema[];
  excludeSchema?: string;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, schemas, excludeSchema, placeholder, className }) => {
  const available = schemas.filter((s) => s.name !== excludeSchema);
  return (
    <Select value={value || '_none_'} onValueChange={(v) => onChange(v === '_none_' ? '' : v)}>
      <SelectTrigger className={cn('h-8 text-xs font-mono', className)}>
        <SelectValue placeholder={placeholder || 'Select schema...'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='_none_'>
          <span className='text-muted-foreground'>None</span>
        </SelectItem>
        {available.map((s) => (
          <SelectItem key={s.name} value={`#/components/schemas/${s.name}`}>
            <div className='flex items-center gap-1.5'>
              <Link className='h-3 w-3 text-muted-foreground' />
              {s.name}
            </div>
          </SelectItem>
        ))}
        {available.length === 0 && (
          <div className='px-2 py-1.5 text-xs text-muted-foreground'>No schemas available</div>
        )}
      </SelectContent>
    </Select>
  );
};

// ─── Enum Chip Editor ────────────────────────────────────────────────────────

const EnumChipEditor: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  compact?: boolean;
}> = ({ values, onChange, compact }) => {
  const [input, setInput] = useState('');
  const addValue = () => {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setInput('');
  };
  return (
    <div>
      <Label className={cn(compact ? 'text-[9px]' : 'text-[10px]', 'text-muted-foreground')}>
        Enum Values
      </Label>
      <div className='flex flex-wrap gap-1 mt-1'>
        {values.map((v, i) => (
          <Badge
            key={i}
            variant='secondary'
            className={cn(
              'gap-1 font-mono',
              compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5',
            )}
          >
            {v}
            <button
              type='button'
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className='ml-0.5 hover:text-destructive transition-colors'
            >
              <X className='h-2.5 w-2.5' />
            </button>
          </Badge>
        ))}
        <div className='flex items-center gap-1'>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addValue();
              }
            }}
            placeholder='Add value…'
            className={cn(
              'font-mono',
              compact ? 'h-5 w-20 text-[9px] px-1.5' : 'h-6 w-24 text-[10px] px-2',
            )}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')}
            onClick={addValue}
            disabled={!input.trim()}
          >
            <Plus className='h-3 w-3' />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Extensions Editor ───────────────────────────────────────────────────────

const ExtensionsEditor: React.FC<{
  extensions: Record<string, string>;
  onChange: (extensions: Record<string, string>) => void;
  compact?: boolean;
}> = ({ extensions, onChange, compact }) => {
  const entries = Object.entries(extensions);
  const [newKey, setNewKey] = useState('');

  const addEntry = () => {
    const key = newKey.trim();
    if (!key) return;
    const finalKey = key.startsWith('x-') ? key : `x-${key}`;
    if (extensions[finalKey] !== undefined) return;
    onChange({ ...extensions, [finalKey]: '' });
    setNewKey('');
  };

  const removeEntry = (key: string) => {
    const next = { ...extensions };
    delete next[key];
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...extensions, [key]: value });
  };

  const updateKey = (oldKey: string, newKeyRaw: string) => {
    const nk = newKeyRaw.startsWith('x-') ? newKeyRaw : `x-${newKeyRaw}`;
    if (nk === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(extensions)) {
      next[k === oldKey ? nk : k] = v;
    }
    onChange(next);
  };

  return (
    <div className='space-y-1.5'>
      {entries.map(([key, val]) => (
        <div key={key} className='flex items-start gap-1.5'>
          <div className='flex-1'>
            <Input
              value={key}
              onChange={(e) => updateKey(key, e.target.value)}
              className={cn('font-mono', compact ? 'h-7 text-[11px]' : 'h-8 text-xs')}
              placeholder='x-key'
            />
          </div>
          <div className='flex-[2]'>
            <Input
              value={val}
              onChange={(e) => updateValue(key, e.target.value)}
              className={cn(compact ? 'h-7 text-[11px]' : 'h-8 text-xs')}
              placeholder='value (string or JSON)'
            />
          </div>
          <Button
            variant='ghost'
            size='icon'
            className={cn('shrink-0 text-destructive', compact ? 'h-7 w-7' : 'h-8 w-8')}
            onClick={() => removeEntry(key)}
          >
            <Trash2 className='h-3 w-3' />
          </Button>
        </div>
      ))}
      <div className='flex items-center gap-1.5'>
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addEntry();
            }
          }}
          placeholder='x-extension-name'
          className={cn('font-mono flex-1', compact ? 'h-7 text-[11px]' : 'h-8 text-xs')}
        />
        <Button
          variant='outline'
          size='sm'
          className={cn('gap-1 shrink-0', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}
          onClick={addEntry}
          disabled={!newKey.trim()}
        >
          <Plus className='h-3 w-3' /> Add
        </Button>
      </div>
    </div>
  );
};

// ─── Inline Property Editor ─────────────────────────────────────────────────

const InlinePropertyEditor: React.FC<{
  schema: InlineSchema;
  onChange: (schema: InlineSchema) => void;
  availableSchemas: OpenApiSchema[];
  compact?: boolean;
}> = ({ schema, onChange, availableSchemas, compact }) => {
  const updateProp = (pi: number, updater: (p: SchemaProperty) => SchemaProperty) => {
    const props = [...schema.properties];
    props[pi] = updater(props[pi]);
    onChange({ ...schema, properties: props });
  };

  return (
    <div className='space-y-2'>
      {schema.properties.map((prop, pi) => (
        <div key={pi} className='border rounded-lg p-2 space-y-1.5 bg-background/50'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] font-bold text-muted-foreground font-mono'>
              {prop.name || `prop ${pi + 1}`}
            </span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5 text-destructive'
              onClick={() =>
                onChange({ ...schema, properties: schema.properties.filter((_, j) => j !== pi) })
              }
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
          <div className='grid grid-cols-3 gap-1.5'>
            <div>
              <Label className='text-[9px] text-muted-foreground'>Name</Label>
              <Input
                value={prop.name}
                onChange={(e) => updateProp(pi, (p) => ({ ...p, name: e.target.value }))}
                className='h-7 text-[11px] font-mono'
              />
            </div>
            <div>
              <Label className='text-[9px] text-muted-foreground'>Type</Label>
              <Select
                value={prop.type}
                onValueChange={(v) =>
                  updateProp(pi, (p) => ({
                    ...p,
                    type: v,
                    ...(v === '$ref' ? { $ref: p.$ref || '' } : { $ref: '' }),
                  }))
                }
              >
                <SelectTrigger className='h-7 text-[11px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {prop.type === '$ref' ? (
              <div>
                <Label className='text-[9px] text-muted-foreground'>$ref</Label>
                <SchemaRefPicker
                  value={prop.$ref || ''}
                  onChange={(ref) => updateProp(pi, (p) => ({ ...p, $ref: ref }))}
                  schemas={availableSchemas}
                  className='h-7'
                />
              </div>
            ) : prop.type === 'array' ? (
              <div>
                <Label className='text-[9px] text-muted-foreground'>Items</Label>
                <Select
                  value={prop.items?.$ref ? '$ref' : prop.items?.type || 'string'}
                  onValueChange={(v) => {
                    if (v === '$ref') {
                      updateProp(pi, (p) => ({ ...p, items: { $ref: '', type: '' } }));
                    } else {
                      updateProp(pi, (p) => ({ ...p, items: { type: v, $ref: '' } }));
                    }
                  }}
                >
                  <SelectTrigger className='h-7 text-[11px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEMA_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : ['string', 'number', 'integer'].includes(prop.type) ? (
              <div>
                <Label className='text-[9px] text-muted-foreground'>Format</Label>
                <Input
                  value={prop.format || ''}
                  onChange={(e) => updateProp(pi, (p) => ({ ...p, format: e.target.value }))}
                  className='h-7 text-[11px]'
                  placeholder='format'
                />
              </div>
            ) : null}
          </div>
          {!compact && (
            <>
              <div>
                <Label className='text-[9px] text-muted-foreground'>Description</Label>
                <Input
                  value={prop.description || ''}
                  onChange={(e) => updateProp(pi, (p) => ({ ...p, description: e.target.value }))}
                  className='h-7 text-[11px]'
                  placeholder='Property description...'
                />
              </div>
              {prop.type !== '$ref' && (
                <div className='grid grid-cols-2 gap-1.5'>
                  <div>
                    <Label className='text-[9px] text-muted-foreground'>Example</Label>
                    <Input
                      value={prop.example || ''}
                      onChange={(e) => updateProp(pi, (p) => ({ ...p, example: e.target.value }))}
                      className='h-7 text-[11px]'
                      placeholder='e.g. John'
                    />
                  </div>
                  <div>
                    <Label className='text-[9px] text-muted-foreground'>Default</Label>
                    <Input
                      value={prop.default || ''}
                      onChange={(e) => updateProp(pi, (p) => ({ ...p, default: e.target.value }))}
                      className='h-7 text-[11px]'
                      placeholder='default value'
                    />
                  </div>
                </div>
              )}
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-1'>
                  <Checkbox
                    checked={!!prop.required}
                    onCheckedChange={(c) => updateProp(pi, (p) => ({ ...p, required: !!c }))}
                    className='h-3.5 w-3.5'
                  />
                  <Label className='text-[9px]'>Required</Label>
                </div>
                <div className='flex items-center gap-1'>
                  <Checkbox
                    checked={!!prop.nullable}
                    onCheckedChange={(c) => updateProp(pi, (p) => ({ ...p, nullable: !!c }))}
                    className='h-3.5 w-3.5'
                  />
                  <Label className='text-[9px]'>Nullable</Label>
                </div>
              </div>
              {['string', 'number', 'integer'].includes(prop.type) && (
                <EnumChipEditor
                  values={prop.enum || []}
                  onChange={(vals) => updateProp(pi, (p) => ({ ...p, enum: vals }))}
                  compact
                />
              )}
              {prop.type === 'object' && (
                <div className='ml-2 border-l-2 border-primary/20 pl-2'>
                  <Label className='text-[9px] text-muted-foreground'>Nested Properties</Label>
                  <InlinePropertyEditor
                    schema={{ type: 'object', properties: prop.properties || [] }}
                    onChange={(nested) =>
                      updateProp(pi, (p) => ({ ...p, properties: nested.properties }))
                    }
                    availableSchemas={availableSchemas}
                    compact
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}
      <Button
        size='sm'
        variant='outline'
        className='h-6 text-[10px] gap-1 w-full'
        onClick={() =>
          onChange({ ...schema, properties: [...schema.properties, { name: '', type: 'string' }] })
        }
      >
        <Plus className='h-3 w-3' /> Add Property
      </Button>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

interface OpenApiUiEditorProps {
  value: string;
  onChange: (value: string) => void;
  format: 'json' | 'yaml';
}

const OpenApiUiEditor: React.FC<OpenApiUiEditorProps> = ({ value, onChange, format }) => {
  const [doc, setDoc] = useState<OpenApiDoc>(() => rawToDoc({}));
  const [activeSection, setActiveSection] = useState<NavSection>('info');
  const [expandedPaths, setExpandedPaths] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const parse = async () => {
      try {
        if (value) {
          const raw = await parseString(value);
          setDoc(rawToDoc(raw));
        }
      } catch {}
      setInitialized(true);
    };
    parse();
  }, [value]);

  const syncToParent = useCallback(
    async (newDoc: OpenApiDoc) => {
      try {
        const raw = docToRaw(newDoc);
        const str = await stringify(raw, { format });
        onChange(str as string);
      } catch {}
    },
    [format, onChange],
  );

  const updateDoc = useCallback(
    (updater: (prev: OpenApiDoc) => OpenApiDoc) => {
      setDoc((prev) => {
        const next = updater(prev);
        syncToParent(next);
        return next;
      });
    },
    [syncToParent],
  );

  const togglePathExpanded = (idx: number) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  const renderNav = () => (
    <div className='w-56 border-r bg-muted/20 flex flex-col h-full'>
      <div className='p-3 border-b'>
        <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          Structure
        </span>
      </div>
      <div className='flex-1 overflow-y-auto py-1'>
        <NavItem
          icon={<Info className='h-3.5 w-3.5' />}
          label='Info'
          active={activeSection === 'info'}
          onClick={() => setActiveSection('info')}
        />
        <NavItem
          icon={<Server className='h-3.5 w-3.5' />}
          label='Servers'
          badge={doc.servers.length}
          active={activeSection === 'servers'}
          onClick={() => setActiveSection('servers')}
        />
        <NavItem
          icon={<Tag className='h-3.5 w-3.5' />}
          label='Tags'
          badge={doc.tags.length}
          active={activeSection === 'tags'}
          onClick={() => setActiveSection('tags')}
        />
        <NavItem
          icon={<Lock className='h-3.5 w-3.5' />}
          label='Security'
          badge={(doc.security || []).length}
          active={activeSection === 'security'}
          onClick={() => setActiveSection('security')}
        />

        {/* Paths */}
        <div className='mt-1'>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
              Paths
            </span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  paths: [...d.paths, { path: '/new-path', operations: {} }],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.paths.map((p, idx) => (
            <div key={idx}>
              <div className='flex items-center group'>
                <button className='px-1 py-0.5 ml-1' onClick={() => togglePathExpanded(idx)}>
                  {expandedPaths.has(idx) ? (
                    <ChevronDown className='h-3 w-3 text-muted-foreground' />
                  ) : (
                    <ChevronRight className='h-3 w-3 text-muted-foreground' />
                  )}
                </button>
                <NavItem
                  icon={<GitBranch className='h-3.5 w-3.5' />}
                  label={p.path}
                  active={activeSection === `path:${idx}`}
                  onClick={() => setActiveSection(`path:${idx}`)}
                  className='flex-1 min-w-0'
                  mono
                />
              </div>
              {expandedPaths.has(idx) && (
                <div className='ml-6'>
                  {Object.keys(p.operations).map((method) => (
                    <NavItem
                      key={method}
                      icon={
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase px-1 py-0.5 rounded',
                            methodColors[method],
                          )}
                        >
                          {method}
                        </span>
                      }
                      label={
                        p.operations[method].operationId || p.operations[method].summary || method
                      }
                      active={activeSection === `path:${idx}:${method}`}
                      onClick={() => setActiveSection(`path:${idx}:${method}`)}
                      small
                    />
                  ))}
                  <button
                    className='flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground w-full'
                    onClick={() => {
                      const available = HTTP_METHODS.filter((m) => !p.operations[m]);
                      if (available.length === 0) return;
                      updateDoc((d) => {
                        const paths = [...d.paths];
                        paths[idx] = {
                          ...paths[idx],
                          operations: {
                            ...paths[idx].operations,
                            [available[0]]: {
                              operationId: '',
                              summary: '',
                              tags: [],
                              parameters: [],
                              responses: [],
                            },
                          },
                        };
                        return { ...d, paths };
                      });
                    }}
                  >
                    <Plus className='h-3 w-3' /> Add operation
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Components section header */}
        <div className='mt-2 mb-1 px-3'>
          <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            Components
          </span>
        </div>

        {/* Schemas */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Schemas</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  schemas: [...d.schemas, { name: 'NewSchema', type: 'object', properties: [] }],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.schemas.map((s, idx) => (
            <NavItem
              key={idx}
              icon={<Box className='h-3.5 w-3.5' />}
              label={s.name}
              badge={s.properties.length}
              active={activeSection === `schema:${idx}`}
              onClick={() => setActiveSection(`schema:${idx}`)}
            />
          ))}
        </div>

        {/* Component Parameters */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Parameters</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentParameters: [
                    ...d.componentParameters,
                    { name: 'NewParam', paramName: '', in: 'query', schema: { type: 'string' } },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentParameters.map((cp, idx) => (
            <NavItem
              key={idx}
              icon={<Settings2 className='h-3.5 w-3.5' />}
              label={cp.name}
              active={activeSection === `componentParam:${idx}`}
              onClick={() => setActiveSection(`componentParam:${idx}`)}
            />
          ))}
        </div>

        {/* Component Responses */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Responses</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentResponses: [
                    ...d.componentResponses,
                    { name: 'NewResponse', description: '' },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentResponses.map((cr, idx) => (
            <NavItem
              key={idx}
              icon={<FileText className='h-3.5 w-3.5' />}
              label={cr.name}
              active={activeSection === `componentResponse:${idx}`}
              onClick={() => setActiveSection(`componentResponse:${idx}`)}
            />
          ))}
        </div>

        {/* Request Bodies */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Request Bodies</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentRequestBodies: [
                    ...d.componentRequestBodies,
                    { name: 'NewRequestBody', description: '', contentType: 'application/json' },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentRequestBodies.map((rb, idx) => (
            <NavItem
              key={idx}
              icon={<FileText className='h-3.5 w-3.5' />}
              label={rb.name}
              active={activeSection === `componentRequestBody:${idx}`}
              onClick={() => setActiveSection(`componentRequestBody:${idx}`)}
            />
          ))}
        </div>

        {/* Headers */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Headers</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentHeaders: [
                    ...d.componentHeaders,
                    { name: 'NewHeader', schema: { type: 'string' } },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentHeaders.map((ch, idx) => (
            <NavItem
              key={idx}
              icon={<Hash className='h-3.5 w-3.5' />}
              label={ch.name}
              active={activeSection === `componentHeader:${idx}`}
              onClick={() => setActiveSection(`componentHeader:${idx}`)}
            />
          ))}
        </div>

        {/* Examples */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Examples</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentExamples: [
                    ...d.componentExamples,
                    { name: 'NewExample', summary: '', value: '' },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentExamples.map((ex, idx) => (
            <NavItem
              key={idx}
              icon={<List className='h-3.5 w-3.5' />}
              label={ex.name}
              active={activeSection === `componentExample:${idx}`}
              onClick={() => setActiveSection(`componentExample:${idx}`)}
            />
          ))}
        </div>

        {/* Links */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Links</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentLinks: [...d.componentLinks, { name: 'NewLink' }],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentLinks.map((lk, idx) => (
            <NavItem
              key={idx}
              icon={<Link className='h-3.5 w-3.5' />}
              label={lk.name}
              active={activeSection === `componentLink:${idx}`}
              onClick={() => setActiveSection(`componentLink:${idx}`)}
            />
          ))}
        </div>

        {/* Callbacks */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Callbacks</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  componentCallbacks: [
                    ...d.componentCallbacks,
                    {
                      name: 'NewCallback',
                      expression: '{$request.body#/callbackUrl}',
                      operations: {},
                    },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.componentCallbacks.map((cb, idx) => (
            <NavItem
              key={idx}
              icon={<Webhook className='h-3.5 w-3.5' />}
              label={cb.name}
              active={activeSection === `componentCallback:${idx}`}
              onClick={() => setActiveSection(`componentCallback:${idx}`)}
            />
          ))}
        </div>

        {/* Security Schemes */}
        <div>
          <div className='flex items-center justify-between px-3 py-1'>
            <span className='text-[10px] font-medium text-muted-foreground'>Security Schemes</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5'
              onClick={() =>
                updateDoc((d) => ({
                  ...d,
                  securitySchemes: [
                    ...d.securitySchemes,
                    { name: 'NewScheme', type: 'apiKey', apiKeyIn: 'header', apiKeyName: '' },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' />
            </Button>
          </div>
          {doc.securitySchemes.map((ss, idx) => (
            <NavItem
              key={idx}
              icon={<Key className='h-3.5 w-3.5' />}
              label={ss.name}
              active={activeSection === `securityScheme:${idx}`}
              onClick={() => setActiveSection(`securityScheme:${idx}`)}
            />
          ))}
        </div>

        {/* Webhooks (3.1+) */}
        {isV31Plus(doc.openapi) && (
          <div className='mt-2'>
            <div className='flex items-center justify-between px-3 py-1'>
              <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                Webhooks
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                onClick={() =>
                  updateDoc((d) => ({
                    ...d,
                    webhooks: [
                      ...d.webhooks,
                      {
                        name: 'newWebhook',
                        operations: {
                          post: {
                            operationId: '',
                            summary: '',
                            tags: [],
                            parameters: [],
                            responses: [{ statusCode: '200', description: 'OK' }],
                          },
                        },
                      },
                    ],
                  }))
                }
              >
                <Plus className='h-3 w-3' />
              </Button>
            </div>
            {doc.webhooks.map((wh, idx) => (
              <NavItem
                key={idx}
                icon={<Webhook className='h-3.5 w-3.5' />}
                label={wh.name}
                active={activeSection === `webhook:${idx}`}
                onClick={() => setActiveSection(`webhook:${idx}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Detail Panels ─────────────────────────────────────────────────────────

  const renderDetail = () => {
    if (activeSection === 'info') return renderInfoPanel();
    if (activeSection === 'servers') return renderServersPanel();
    if (activeSection === 'tags') return renderTagsPanel();
    if (activeSection === 'security') return renderGlobalSecurityPanel();
    if (activeSection.startsWith('path:')) {
      const parts = activeSection.split(':');
      const pathIdx = parseInt(parts[1], 10);
      if (parts.length === 3) return renderOperationPanel(pathIdx, parts[2]);
      return renderPathPanel(pathIdx);
    }
    if (activeSection.startsWith('schema:'))
      return renderSchemaPanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentParam:'))
      return renderComponentParamPanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentResponse:'))
      return renderComponentResponsePanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentRequestBody:'))
      return renderComponentRequestBodyPanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentHeader:'))
      return renderComponentHeaderPanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentExample:'))
      return renderComponentExamplePanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentLink:'))
      return renderComponentLinkPanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('componentCallback:')) {
      const parts = activeSection.split(':');
      const cbIdx = parseInt(parts[1], 10);
      if (parts.length === 3) return renderCallbackOperationPanel(cbIdx, parts[2]);
      return renderComponentCallbackPanel(cbIdx);
    }
    if (activeSection.startsWith('securityScheme:'))
      return renderSecuritySchemePanel(parseInt(activeSection.split(':')[1], 10));
    if (activeSection.startsWith('webhook:')) {
      const parts = activeSection.split(':');
      const whIdx = parseInt(parts[1], 10);
      if (parts.length === 3) return renderWebhookOperationPanel(whIdx, parts[2]);
      return renderWebhookPanel(whIdx);
    }
    return null;
  };

  // ── Info ──
  const renderInfoPanel = () => (
    <DetailPanel title='API Information' icon={<Info className='h-4 w-4' />}>
      <FieldGroup>
        <Field label='OpenAPI Version'>
          <Select
            value={doc.openapi}
            onValueChange={(v) => updateDoc((d) => ({ ...d, openapi: v }))}
          >
            <SelectTrigger className='h-9'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENAPI_VERSIONS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label='Title'>
          <Input
            value={doc.info.title || ''}
            onChange={(e) =>
              updateDoc((d) => ({ ...d, info: { ...d.info, title: e.target.value } }))
            }
            placeholder='My API'
            className='h-9'
          />
        </Field>
        <Field label='Version'>
          <Input
            value={doc.info.version || ''}
            onChange={(e) =>
              updateDoc((d) => ({ ...d, info: { ...d.info, version: e.target.value } }))
            }
            placeholder='1.0.0'
            className='h-9'
          />
        </Field>
        <Field label='Description' full>
          <Textarea
            value={doc.info.description || ''}
            onChange={(e) =>
              updateDoc((d) => ({ ...d, info: { ...d.info, description: e.target.value } }))
            }
            placeholder='API description...'
            className='min-h-[80px] text-sm'
          />
        </Field>
        <Field label='Terms of Service'>
          <Input
            value={doc.info.termsOfService || ''}
            onChange={(e) =>
              updateDoc((d) => ({ ...d, info: { ...d.info, termsOfService: e.target.value } }))
            }
            placeholder='https://...'
            className='h-9'
          />
        </Field>
      </FieldGroup>
      <SubSection title='Contact'>
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={doc.info.contact?.name || ''}
              onChange={(e) =>
                updateDoc((d) => ({
                  ...d,
                  info: { ...d.info, contact: { ...d.info.contact, name: e.target.value } },
                }))
              }
              className='h-9'
            />
          </Field>
          <Field label='Email'>
            <Input
              value={doc.info.contact?.email || ''}
              onChange={(e) =>
                updateDoc((d) => ({
                  ...d,
                  info: { ...d.info, contact: { ...d.info.contact, email: e.target.value } },
                }))
              }
              className='h-9'
            />
          </Field>
          <Field label='URL'>
            <Input
              value={doc.info.contact?.url || ''}
              onChange={(e) =>
                updateDoc((d) => ({
                  ...d,
                  info: { ...d.info, contact: { ...d.info.contact, url: e.target.value } },
                }))
              }
              className='h-9'
            />
          </Field>
        </FieldGroup>
      </SubSection>
      <SubSection title='License'>
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={doc.info.license?.name || ''}
              onChange={(e) =>
                updateDoc((d) => ({
                  ...d,
                  info: { ...d.info, license: { ...d.info.license, name: e.target.value } },
                }))
              }
              className='h-9'
            />
          </Field>
          <Field label='URL'>
            <Input
              value={doc.info.license?.url || ''}
              onChange={(e) =>
                updateDoc((d) => ({
                  ...d,
                  info: { ...d.info, license: { ...d.info.license, url: e.target.value } },
                }))
              }
              className='h-9'
            />
          </Field>
        </FieldGroup>
      </SubSection>
      <SubSection title='Extensions (x-*)'>
        <ExtensionsEditor
          extensions={doc.info.extensions || {}}
          onChange={(extensions) => updateDoc((d) => ({ ...d, info: { ...d.info, extensions } }))}
        />
      </SubSection>
    </DetailPanel>
  );

  // ── Servers ──
  const renderServersPanel = () => (
    <DetailPanel
      title='Servers'
      icon={<Server className='h-4 w-4' />}
      action={
        <Button
          size='sm'
          className='h-7 text-xs gap-1'
          onClick={() =>
            updateDoc((d) => ({
              ...d,
              servers: [...d.servers, { url: 'https://', description: '' }],
            }))
          }
        >
          <Plus className='h-3 w-3' /> Add Server
        </Button>
      }
    >
      {doc.servers.map((srv, i) => (
        <div key={i} className='border rounded-lg p-4 space-y-3 bg-card'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-muted-foreground'>Server {i + 1}</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-destructive'
              onClick={() =>
                updateDoc((d) => ({ ...d, servers: d.servers.filter((_, j) => j !== i) }))
              }
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
          <Field label='URL'>
            <Input
              value={srv.url}
              onChange={(e) =>
                updateDoc((d) => {
                  const servers = [...d.servers];
                  servers[i] = { ...servers[i], url: e.target.value };
                  return { ...d, servers };
                })
              }
              className='h-9 font-mono text-sm'
            />
          </Field>
          <Field label='Description'>
            <Input
              value={srv.description || ''}
              onChange={(e) =>
                updateDoc((d) => {
                  const servers = [...d.servers];
                  servers[i] = { ...servers[i], description: e.target.value };
                  return { ...d, servers };
                })
              }
              className='h-9'
            />
          </Field>
        </div>
      ))}
      {doc.servers.length === 0 && <EmptyState text='No servers defined' />}
    </DetailPanel>
  );

  // ── Tags ──
  const renderTagsPanel = () => (
    <DetailPanel
      title='Tags'
      icon={<Tag className='h-4 w-4' />}
      action={
        <Button
          size='sm'
          className='h-7 text-xs gap-1'
          onClick={() =>
            updateDoc((d) => ({ ...d, tags: [...d.tags, { name: 'NewTag', description: '' }] }))
          }
        >
          <Plus className='h-3 w-3' /> Add Tag
        </Button>
      }
    >
      {doc.tags.map((tag, i) => (
        <div key={i} className='border rounded-lg p-4 space-y-3 bg-card'>
          <div className='flex items-center justify-between'>
            <Badge variant='secondary' className='text-xs'>
              {tag.name}
            </Badge>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-destructive'
              onClick={() => updateDoc((d) => ({ ...d, tags: d.tags.filter((_, j) => j !== i) }))}
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
          <Field label='Name'>
            <Input
              value={tag.name}
              onChange={(e) =>
                updateDoc((d) => {
                  const tags = [...d.tags];
                  tags[i] = { ...tags[i], name: e.target.value };
                  return { ...d, tags };
                })
              }
              className='h-9'
            />
          </Field>
          <Field label='Description'>
            <Input
              value={tag.description || ''}
              onChange={(e) =>
                updateDoc((d) => {
                  const tags = [...d.tags];
                  tags[i] = { ...tags[i], description: e.target.value };
                  return { ...d, tags };
                })
              }
              className='h-9'
            />
          </Field>
        </div>
      ))}
      {doc.tags.length === 0 && <EmptyState text='No tags defined' />}
    </DetailPanel>
  );

  // ── Global Security ──
  const renderGlobalSecurityPanel = () => (
    <DetailPanel
      title='Global Security'
      icon={<Lock className='h-4 w-4' />}
      action={
        <Button
          size='sm'
          className='h-7 text-xs gap-1'
          onClick={() =>
            updateDoc((d) => ({
              ...d,
              security: [...(d.security || []), { name: '', scopes: [] }],
            }))
          }
        >
          <Plus className='h-3 w-3' /> Add
        </Button>
      }
    >
      <p className='text-xs text-muted-foreground'>
        Security requirements applied globally. Individual operations can override these.
      </p>
      {(doc.security || []).map((sec, i) => (
        <div key={i} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-muted-foreground'>Requirement {i + 1}</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5 text-destructive'
              onClick={() =>
                updateDoc((d) => ({ ...d, security: d.security.filter((_, j) => j !== i) }))
              }
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <Label className='text-[10px] text-muted-foreground'>Scheme</Label>
              <Select
                value={sec.name || '_none_'}
                onValueChange={(v) =>
                  updateDoc((d) => {
                    const security = [...d.security];
                    security[i] = { ...security[i], name: v === '_none_' ? '' : v };
                    return { ...d, security };
                  })
                }
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue placeholder='Select scheme...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_none_'>
                    <span className='text-muted-foreground'>None</span>
                  </SelectItem>
                  {doc.securitySchemes.map((ss) => (
                    <SelectItem key={ss.name} value={ss.name}>
                      {ss.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-[10px] text-muted-foreground'>Scopes (comma-sep)</Label>
              <Input
                value={sec.scopes.join(', ')}
                onChange={(e) =>
                  updateDoc((d) => {
                    const security = [...d.security];
                    security[i] = {
                      ...security[i],
                      scopes: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    };
                    return { ...d, security };
                  })
                }
                className='h-8 text-xs'
                placeholder='read, write'
              />
            </div>
          </div>
        </div>
      ))}
      {(doc.security || []).length === 0 && (
        <EmptyState text='No global security requirements' small />
      )}
    </DetailPanel>
  );

  // ── Path ──
  const renderPathPanel = (pathIdx: number) => {
    const path = doc.paths[pathIdx];
    if (!path) return null;
    return (
      <DetailPanel
        title={path.path}
        icon={<GitBranch className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({ ...d, paths: d.paths.filter((_, i) => i !== pathIdx) }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <Field label='Path'>
          <Input
            value={path.path}
            onChange={(e) =>
              updateDoc((d) => {
                const paths = [...d.paths];
                paths[pathIdx] = { ...paths[pathIdx], path: e.target.value };
                return { ...d, paths };
              })
            }
            className='h-9 font-mono'
          />
        </Field>
        <SubSection title='Operations'>
          <div className='space-y-2'>
            {Object.entries(path.operations).map(([method]) => (
              <div
                key={method}
                className='flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50'
                onClick={() => setActiveSection(`path:${pathIdx}:${method}`)}
              >
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                      methodColors[method],
                    )}
                  >
                    {method}
                  </span>
                  <span className='text-sm'>
                    {path.operations[method].summary || path.operations[method].operationId || ''}
                  </span>
                </div>
                <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={path.extensions || {}}
            onChange={(extensions) =>
              updateDoc((d) => {
                const paths = [...d.paths];
                paths[pathIdx] = { ...paths[pathIdx], extensions };
                return { ...d, paths };
              })
            }
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Operation ──
  const renderOperationPanel = (pathIdx: number, method: string) => {
    const path = doc.paths[pathIdx];
    const op = path?.operations[method];
    if (!op) return null;

    const updateOp = (updater: (op: OpenApiOperation) => OpenApiOperation) => {
      updateDoc((d) => {
        const paths = [...d.paths];
        paths[pathIdx] = {
          ...paths[pathIdx],
          operations: {
            ...paths[pathIdx].operations,
            [method]: updater(paths[pathIdx].operations[method]),
          },
        };
        return { ...d, paths };
      });
    };

    return (
      <DetailPanel
        title={
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'text-xs font-bold uppercase px-2 py-0.5 rounded',
                methodColors[method],
              )}
            >
              {method}
            </span>
            <span className='font-mono text-sm'>{path.path}</span>
          </div>
        }
        icon={null}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => {
                const paths = [...d.paths];
                const ops = { ...paths[pathIdx].operations };
                delete ops[method];
                paths[pathIdx] = { ...paths[pathIdx], operations: ops };
                return { ...d, paths };
              });
              setActiveSection(`path:${pathIdx}`);
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Operation ID'>
            <Input
              value={op.operationId || ''}
              onChange={(e) => updateOp((o) => ({ ...o, operationId: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Summary'>
            <Input
              value={op.summary || ''}
              onChange={(e) => updateOp((o) => ({ ...o, summary: e.target.value }))}
              className='h-9'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={op.description || ''}
              onChange={(e) => updateOp((o) => ({ ...o, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
          <Field label='Tags' full>
            <Input
              value={(op.tags || []).join(', ')}
              onChange={(e) =>
                updateOp((o) => ({
                  ...o,
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              placeholder='tag1, tag2'
              className='h-9'
            />
          </Field>
        </FieldGroup>

        {/* Parameters */}
        <SubSection
          title='Parameters'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateOp((o) => ({
                  ...o,
                  parameters: [
                    ...(o.parameters || []),
                    { name: '', in: 'query', schema: { type: 'string' } },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {(op.parameters || []).map((param, pi) => (
            <div key={pi} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>
                  {param.name || `Param ${pi + 1}`}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateOp((o) => ({
                      ...o,
                      parameters: (o.parameters || []).filter((_, j) => j !== pi),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-3 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Name</Label>
                  <Input
                    value={param.name}
                    onChange={(e) =>
                      updateOp((o) => {
                        const params = [...(o.parameters || [])];
                        params[pi] = { ...params[pi], name: e.target.value };
                        return { ...o, parameters: params };
                      })
                    }
                    className='h-8 text-xs'
                  />
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>In</Label>
                  <Select
                    value={param.in}
                    onValueChange={(v) =>
                      updateOp((o) => {
                        const params = [...(o.parameters || [])];
                        params[pi] = { ...params[pi], in: v as any };
                        return { ...o, parameters: params };
                      })
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAM_LOCATIONS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Type</Label>
                  <Select
                    value={param.schema?.type || 'string'}
                    onValueChange={(v) =>
                      updateOp((o) => {
                        const params = [...(o.parameters || [])];
                        params[pi] = { ...params[pi], schema: { ...params[pi].schema, type: v } };
                        return { ...o, parameters: params };
                      })
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEMA_TYPES.filter((t) => t !== '$ref').map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={!!param.required}
                  onCheckedChange={(c) =>
                    updateOp((o) => {
                      const params = [...(o.parameters || [])];
                      params[pi] = { ...params[pi], required: !!c };
                      return { ...o, parameters: params };
                    })
                  }
                />
                <Label className='text-xs'>Required</Label>
              </div>
            </div>
          ))}
          {(!op.parameters || op.parameters.length === 0) && (
            <EmptyState text='No parameters' small />
          )}
        </SubSection>

        {/* Request Body */}
        <SubSection
          title='Request Body'
          action={
            !op.requestBody ? (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1'
                onClick={() =>
                  updateOp((o) => ({
                    ...o,
                    requestBody: { contentType: 'application/json', required: false },
                  }))
                }
              >
                <Plus className='h-3 w-3' /> Add
              </Button>
            ) : (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1 text-destructive'
                onClick={() => updateOp((o) => ({ ...o, requestBody: undefined }))}
              >
                <Trash2 className='h-3 w-3' /> Remove
              </Button>
            )
          }
        >
          {op.requestBody ? (
            <div className='border rounded-lg p-3 space-y-3 bg-muted/20'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Content Type</Label>
                  <Select
                    value={op.requestBody.contentType || 'application/json'}
                    onValueChange={(v) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, contentType: v },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema Mode</Label>
                  <Select
                    value={
                      op.requestBody.schemaRef
                        ? '$ref'
                        : op.requestBody.inlineSchema
                          ? 'inline'
                          : 'none'
                    }
                    onValueChange={(v) => {
                      if (v === '$ref')
                        updateOp((o) => ({
                          ...o,
                          requestBody: {
                            ...o.requestBody!,
                            schemaRef: '',
                            inlineSchema: undefined,
                          },
                        }));
                      else if (v === 'inline')
                        updateOp((o) => ({
                          ...o,
                          requestBody: {
                            ...o.requestBody!,
                            schemaRef: undefined,
                            inlineSchema: { type: 'object', properties: [] },
                          },
                        }));
                      else
                        updateOp((o) => ({
                          ...o,
                          requestBody: {
                            ...o.requestBody!,
                            schemaRef: undefined,
                            inlineSchema: undefined,
                          },
                        }));
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>
                        <span className='text-muted-foreground'>None</span>
                      </SelectItem>
                      <SelectItem value='$ref'>$ref (reference)</SelectItem>
                      <SelectItem value='inline'>Inline (define here)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {op.requestBody.schemaRef !== undefined && (
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema ($ref)</Label>
                  <SchemaRefPicker
                    value={op.requestBody.schemaRef || ''}
                    onChange={(ref) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, schemaRef: ref || undefined },
                      }))
                    }
                    schemas={doc.schemas}
                  />
                </div>
              )}
              {op.requestBody.inlineSchema && (
                <div className='space-y-1.5'>
                  <Label className='text-[10px] text-muted-foreground'>
                    Inline Schema Properties
                  </Label>
                  <InlinePropertyEditor
                    schema={op.requestBody.inlineSchema}
                    onChange={(inlineSchema) =>
                      updateOp((o) => ({ ...o, requestBody: { ...o.requestBody!, inlineSchema } }))
                    }
                    availableSchemas={doc.schemas}
                  />
                </div>
              )}
              <Field label='Description'>
                <Input
                  value={op.requestBody.description || ''}
                  onChange={(e) =>
                    updateOp((o) => ({
                      ...o,
                      requestBody: { ...o.requestBody!, description: e.target.value },
                    }))
                  }
                  className='h-8 text-xs'
                />
              </Field>
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={!!op.requestBody.required}
                  onCheckedChange={(c) =>
                    updateOp((o) => ({ ...o, requestBody: { ...o.requestBody!, required: !!c } }))
                  }
                />
                <Label className='text-xs'>Required</Label>
              </div>
            </div>
          ) : (
            <EmptyState text='No request body' small />
          )}
        </SubSection>

        {/* Responses */}
        <SubSection
          title='Responses'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateOp((o) => ({
                  ...o,
                  responses: [
                    ...(o.responses || []),
                    { statusCode: '200', description: '', contentType: 'application/json' },
                  ],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {(op.responses || []).map((resp, ri) => (
            <div key={ri} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <Badge variant='outline' className='text-xs font-mono'>
                  {resp.statusCode}
                </Badge>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateOp((o) => ({
                      ...o,
                      responses: (o.responses || []).filter((_, j) => j !== ri),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Status Code</Label>
                  <Input
                    value={resp.statusCode}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], statusCode: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs font-mono'
                  />
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Description</Label>
                  <Input
                    value={resp.description}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], description: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Content Type</Label>
                  <Select
                    value={resp.contentType || '_none_'}
                    onValueChange={(v) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = {
                          ...responses[ri],
                          contentType: v === '_none_' ? undefined : v,
                        };
                        return { ...o, responses };
                      })
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_none_'>
                        <span className='text-muted-foreground'>None</span>
                      </SelectItem>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema Mode</Label>
                  <Select
                    value={resp.schemaRef ? '$ref' : resp.inlineSchema ? 'inline' : 'none'}
                    onValueChange={(v) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        if (v === '$ref')
                          responses[ri] = {
                            ...responses[ri],
                            schemaRef: '',
                            inlineSchema: undefined,
                          };
                        else if (v === 'inline')
                          responses[ri] = {
                            ...responses[ri],
                            schemaRef: undefined,
                            inlineSchema: { type: 'object', properties: [] },
                          };
                        else
                          responses[ri] = {
                            ...responses[ri],
                            schemaRef: undefined,
                            inlineSchema: undefined,
                          };
                        return { ...o, responses };
                      })
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>
                        <span className='text-muted-foreground'>None</span>
                      </SelectItem>
                      <SelectItem value='$ref'>$ref (reference)</SelectItem>
                      <SelectItem value='inline'>Inline (define here)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {resp.schemaRef !== undefined && (
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema ($ref)</Label>
                  <SchemaRefPicker
                    value={resp.schemaRef || ''}
                    onChange={(ref) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], schemaRef: ref || undefined };
                        return { ...o, responses };
                      })
                    }
                    schemas={doc.schemas}
                  />
                </div>
              )}
              {resp.inlineSchema && (
                <div className='space-y-1.5'>
                  <Label className='text-[10px] text-muted-foreground'>
                    Inline Schema Properties
                  </Label>
                  <InlinePropertyEditor
                    schema={resp.inlineSchema}
                    onChange={(inlineSchema) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], inlineSchema };
                        return { ...o, responses };
                      })
                    }
                    availableSchemas={doc.schemas}
                  />
                </div>
              )}
            </div>
          ))}
          {(!op.responses || op.responses.length === 0) && <EmptyState text='No responses' small />}
        </SubSection>

        {/* Operation Security */}
        <SubSection
          title='Security'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateOp((o) => ({
                  ...o,
                  security: [...(o.security || []), { name: '', scopes: [] }],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {(op.security || []).map((sec, si) => (
            <div key={si} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>
                  Requirement {si + 1}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateOp((o) => ({
                      ...o,
                      security: (o.security || []).filter((_, j) => j !== si),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Scheme</Label>
                  <Select
                    value={sec.name || '_none_'}
                    onValueChange={(v) =>
                      updateOp((o) => {
                        const security = [...(o.security || [])];
                        security[si] = { ...security[si], name: v === '_none_' ? '' : v };
                        return { ...o, security };
                      })
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_none_'>
                        <span className='text-muted-foreground'>None</span>
                      </SelectItem>
                      {doc.securitySchemes.map((ss) => (
                        <SelectItem key={ss.name} value={ss.name}>
                          {ss.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Scopes</Label>
                  <Input
                    value={sec.scopes.join(', ')}
                    onChange={(e) =>
                      updateOp((o) => {
                        const security = [...(o.security || [])];
                        security[si] = {
                          ...security[si],
                          scopes: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        return { ...o, security };
                      })
                    }
                    className='h-8 text-xs'
                    placeholder='read, write'
                  />
                </div>
              </div>
            </div>
          ))}
          {(!op.security || op.security.length === 0) && (
            <EmptyState text='Inherits global security' small />
          )}
        </SubSection>

        {/* Extensions */}
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={op.extensions || {}}
            onChange={(extensions) => updateOp((o) => ({ ...o, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Schema ──
  const renderSchemaPanel = (idx: number) => {
    const schema = doc.schemas[idx];
    if (!schema) return null;
    const updateSchema = (updater: (s: OpenApiSchema) => OpenApiSchema) => {
      updateDoc((d) => {
        const schemas = [...d.schemas];
        schemas[idx] = updater(schemas[idx]);
        return { ...d, schemas };
      });
    };
    const updateProp = (pi: number, updater: (p: SchemaProperty) => SchemaProperty) => {
      updateSchema((s) => {
        const props = [...s.properties];
        props[pi] = updater(props[pi]);
        return { ...s, properties: props };
      });
    };

    return (
      <DetailPanel
        title={schema.name}
        icon={<Box className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({ ...d, schemas: d.schemas.filter((_, i) => i !== idx) }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={schema.name}
              onChange={(e) => updateSchema((s) => ({ ...s, name: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Type'>
            <Select
              value={schema.type}
              onValueChange={(v) => updateSchema((s) => ({ ...s, type: v }))}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_TYPES.filter((t) => t !== '$ref').map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Description' full>
            <Textarea
              value={schema.description || ''}
              onChange={(e) => updateSchema((s) => ({ ...s, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <SubSection
          title='Properties'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateSchema((s) => ({
                  ...s,
                  properties: [...s.properties, { name: '', type: 'string' }],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {schema.properties.map((prop, pi) => (
            <div key={pi} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>
                  {prop.name || `Property ${pi + 1}`}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateSchema((s) => ({
                      ...s,
                      properties: s.properties.filter((_, j) => j !== pi),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-3 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Name</Label>
                  <Input
                    value={prop.name}
                    onChange={(e) => updateProp(pi, (p) => ({ ...p, name: e.target.value }))}
                    className='h-8 text-xs font-mono'
                  />
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Type</Label>
                  <Select
                    value={prop.type}
                    onValueChange={(v) =>
                      updateProp(pi, (p) => ({
                        ...p,
                        type: v,
                        ...(v === '$ref' ? { $ref: p.$ref || '' } : { $ref: '' }),
                        ...(v === 'array' ? { items: p.items || { type: 'string' } } : {}),
                      }))
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEMA_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {prop.type === '$ref' ? (
                    <>
                      <Label className='text-[10px] text-muted-foreground'>$ref Schema</Label>
                      <SchemaRefPicker
                        value={prop.$ref || ''}
                        onChange={(ref) => updateProp(pi, (p) => ({ ...p, $ref: ref }))}
                        schemas={doc.schemas}
                        excludeSchema={schema.name}
                      />
                    </>
                  ) : prop.type === 'array' ? (
                    <>
                      <Label className='text-[10px] text-muted-foreground'>Items</Label>
                      <Select
                        value={prop.items?.$ref ? '$ref' : prop.items?.type || 'string'}
                        onValueChange={(v) => {
                          if (v === '$ref') {
                            updateProp(pi, (p) => ({ ...p, items: { $ref: '', type: '' } }));
                          } else {
                            updateProp(pi, (p) => ({ ...p, items: { type: v, $ref: '' } }));
                          }
                        }}
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEMA_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : ['string', 'number', 'integer'].includes(prop.type) ? (
                    <>
                      <Label className='text-[10px] text-muted-foreground'>Format</Label>
                      <Input
                        value={prop.format || ''}
                        onChange={(e) => updateProp(pi, (p) => ({ ...p, format: e.target.value }))}
                        placeholder='e.g. uuid, date-time'
                        className='h-8 text-xs'
                      />
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <Label className='text-[10px] text-muted-foreground'>Description</Label>
                <Input
                  value={prop.description || ''}
                  onChange={(e) => updateProp(pi, (p) => ({ ...p, description: e.target.value }))}
                  placeholder='Property description...'
                  className='h-8 text-xs'
                />
              </div>
              {prop.type === 'array' && prop.items?.$ref !== undefined && !prop.items?.type && (
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Items $ref</Label>
                  <SchemaRefPicker
                    value={prop.items.$ref || ''}
                    onChange={(ref) =>
                      updateProp(pi, (p) => ({ ...p, items: { ...p.items, $ref: ref } }))
                    }
                    schemas={doc.schemas}
                    excludeSchema={schema.name}
                  />
                </div>
              )}
              {prop.type !== '$ref' && (
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <Label className='text-[10px] text-muted-foreground'>Example</Label>
                    <Input
                      value={prop.example || ''}
                      onChange={(e) => updateProp(pi, (p) => ({ ...p, example: e.target.value }))}
                      placeholder='e.g. John'
                      className='h-8 text-xs'
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] text-muted-foreground'>Default</Label>
                    <Input
                      value={prop.default || ''}
                      onChange={(e) => updateProp(pi, (p) => ({ ...p, default: e.target.value }))}
                      placeholder='default value'
                      className='h-8 text-xs'
                    />
                  </div>
                </div>
              )}
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    checked={!!prop.required}
                    onCheckedChange={(c) => updateProp(pi, (p) => ({ ...p, required: !!c }))}
                  />
                  <Label className='text-xs'>Required</Label>
                </div>
                {prop.type !== '$ref' && (
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={!!prop.nullable}
                      onCheckedChange={(c) => updateProp(pi, (p) => ({ ...p, nullable: !!c }))}
                    />
                    <Label className='text-xs'>
                      {isV31Plus(doc.openapi) ? 'Nullable (type array)' : 'Nullable'}
                    </Label>
                  </div>
                )}
              </div>
              {['string', 'number', 'integer'].includes(prop.type) && (
                <EnumChipEditor
                  values={prop.enum || []}
                  onChange={(vals) => updateProp(pi, (p) => ({ ...p, enum: vals }))}
                />
              )}
              {prop.type === 'object' && (
                <div className='ml-2 border-l-2 border-primary/20 pl-2 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-[10px] text-muted-foreground font-semibold'>
                      Nested Properties
                    </Label>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-5 text-[10px] gap-1'
                      onClick={() =>
                        updateProp(pi, (p) => ({
                          ...p,
                          properties: [...(p.properties || []), { name: '', type: 'string' }],
                        }))
                      }
                    >
                      <Plus className='h-3 w-3' /> Add
                    </Button>
                  </div>
                  <InlinePropertyEditor
                    schema={{ type: 'object', properties: prop.properties || [] }}
                    onChange={(nested) =>
                      updateProp(pi, (p) => ({ ...p, properties: nested.properties }))
                    }
                    availableSchemas={doc.schemas}
                  />
                </div>
              )}
              {Object.keys(prop.extensions || {}).length > 0 || prop.type !== '$ref' ? (
                <details className='text-xs'>
                  <summary className='text-[10px] text-muted-foreground cursor-pointer hover:text-foreground'>
                    Extensions (x-*)
                  </summary>
                  <div className='mt-1.5'>
                    <ExtensionsEditor
                      extensions={prop.extensions || {}}
                      onChange={(extensions) => updateProp(pi, (p) => ({ ...p, extensions }))}
                      compact
                    />
                  </div>
                </details>
              ) : null}
            </div>
          ))}
          {schema.properties.length === 0 && <EmptyState text='No properties' small />}
        </SubSection>

        {/* Composition: allOf / oneOf / anyOf */}
        {(['allOf', 'oneOf', 'anyOf'] as const).map((keyword) => (
          <SubSection
            key={keyword}
            title={keyword}
            action={
              <div className='flex gap-1'>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-6 text-[11px] gap-1'
                  onClick={() =>
                    updateSchema((s) => ({
                      ...s,
                      [keyword]: [...(s[keyword] || []), { $ref: '' }],
                    }))
                  }
                >
                  <Plus className='h-3 w-3' /> $ref
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-6 text-[11px] gap-1'
                  onClick={() =>
                    updateSchema((s) => ({
                      ...s,
                      [keyword]: [
                        ...(s[keyword] || []),
                        { inlineSchema: { type: 'object', properties: [] } },
                      ],
                    }))
                  }
                >
                  <Plus className='h-3 w-3' /> Inline
                </Button>
              </div>
            }
          >
            {(schema[keyword] || []).map((ref, ri) => (
              <div key={ri} className='border rounded-lg p-2.5 space-y-2 bg-background/50'>
                <div className='flex items-center justify-between'>
                  <Badge variant='secondary' className='text-[9px]'>
                    {ref.$ref ? '$ref' : 'inline'}
                  </Badge>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-5 w-5 text-destructive shrink-0'
                    onClick={() =>
                      updateSchema((s) => ({
                        ...s,
                        [keyword]: (s[keyword] || []).filter((_, j) => j !== ri),
                      }))
                    }
                  >
                    <Trash2 className='h-3 w-3' />
                  </Button>
                </div>
                {ref.inlineSchema ? (
                  <InlinePropertyEditor
                    schema={ref.inlineSchema}
                    onChange={(inlineSchema) =>
                      updateSchema((s) => {
                        const arr = [...(s[keyword] || [])];
                        arr[ri] = { inlineSchema };
                        return { ...s, [keyword]: arr };
                      })
                    }
                    availableSchemas={doc.schemas}
                  />
                ) : (
                  <SchemaRefPicker
                    value={ref.$ref || ''}
                    onChange={(v) =>
                      updateSchema((s) => {
                        const arr = [...(s[keyword] || [])];
                        arr[ri] = { $ref: v };
                        return { ...s, [keyword]: arr };
                      })
                    }
                    schemas={doc.schemas}
                    excludeSchema={schema.name}
                  />
                )}
              </div>
            ))}
            {(!schema[keyword] || schema[keyword]!.length === 0) && (
              <EmptyState text={`No ${keyword} entries`} small />
            )}
          </SubSection>
        ))}

        {/* Discriminator */}
        <SubSection
          title='Discriminator'
          action={
            !schema.discriminator ? (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1'
                onClick={() =>
                  updateSchema((s) => ({ ...s, discriminator: { propertyName: '', mapping: {} } }))
                }
              >
                <Plus className='h-3 w-3' /> Add
              </Button>
            ) : (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1 text-destructive'
                onClick={() => updateSchema((s) => ({ ...s, discriminator: undefined }))}
              >
                <Trash2 className='h-3 w-3' /> Remove
              </Button>
            )
          }
        >
          {schema.discriminator ? (
            <div className='border rounded-lg p-3 space-y-3 bg-muted/20'>
              <Field label='Property Name'>
                <Input
                  value={schema.discriminator.propertyName}
                  onChange={(e) =>
                    updateSchema((s) => ({
                      ...s,
                      discriminator: { ...s.discriminator!, propertyName: e.target.value },
                    }))
                  }
                  className='h-8 text-xs font-mono'
                  placeholder='e.g. petType'
                />
              </Field>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-[10px] text-muted-foreground'>Mapping</Label>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px] gap-1'
                    onClick={() =>
                      updateSchema((s) => ({
                        ...s,
                        discriminator: {
                          ...s.discriminator!,
                          mapping: { ...s.discriminator!.mapping, '': '' },
                        },
                      }))
                    }
                  >
                    <Plus className='h-3 w-3' /> Add
                  </Button>
                </div>
                {Object.entries(schema.discriminator.mapping || {}).map(([key, val], mi) => (
                  <div key={mi} className='flex items-center gap-2'>
                    <Input
                      value={key}
                      onChange={(e) =>
                        updateSchema((s) => {
                          const entries = Object.entries(s.discriminator!.mapping || {});
                          entries[mi] = [e.target.value, entries[mi][1]];
                          return {
                            ...s,
                            discriminator: {
                              ...s.discriminator!,
                              mapping: Object.fromEntries(entries),
                            },
                          };
                        })
                      }
                      className='h-7 text-xs font-mono flex-1'
                      placeholder='value'
                    />
                    <span className='text-xs text-muted-foreground'>→</span>
                    <Input
                      value={val}
                      onChange={(e) =>
                        updateSchema((s) => {
                          const entries = Object.entries(s.discriminator!.mapping || {});
                          entries[mi] = [entries[mi][0], e.target.value];
                          return {
                            ...s,
                            discriminator: {
                              ...s.discriminator!,
                              mapping: Object.fromEntries(entries),
                            },
                          };
                        })
                      }
                      className='h-7 text-xs font-mono flex-1'
                      placeholder='#/components/schemas/...'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-5 w-5 text-destructive shrink-0'
                      onClick={() =>
                        updateSchema((s) => {
                          const entries = Object.entries(s.discriminator!.mapping || {}).filter(
                            (_, j) => j !== mi,
                          );
                          return {
                            ...s,
                            discriminator: {
                              ...s.discriminator!,
                              mapping: Object.fromEntries(entries),
                            },
                          };
                        })
                      }
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text='No discriminator' small />
          )}
        </SubSection>

        {/* Additional Properties */}
        <SubSection title='Additional Properties'>
          <div className='border rounded-lg p-3 space-y-3 bg-muted/20'>
            <div className='flex items-center gap-3'>
              <Select
                value={
                  !schema.additionalProperties
                    ? 'unset'
                    : schema.additionalProperties.enabled
                      ? schema.additionalProperties.$ref
                        ? '$ref'
                        : schema.additionalProperties.type || 'true'
                      : 'false'
                }
                onValueChange={(v) => {
                  if (v === 'unset')
                    updateSchema((s) => ({ ...s, additionalProperties: undefined }));
                  else if (v === 'false')
                    updateSchema((s) => ({ ...s, additionalProperties: { enabled: false } }));
                  else if (v === 'true')
                    updateSchema((s) => ({ ...s, additionalProperties: { enabled: true } }));
                  else if (v === '$ref')
                    updateSchema((s) => ({
                      ...s,
                      additionalProperties: { enabled: true, $ref: '' },
                    }));
                  else
                    updateSchema((s) => ({
                      ...s,
                      additionalProperties: { enabled: true, type: v },
                    }));
                }}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='unset'>
                    <span className='text-muted-foreground'>Not set</span>
                  </SelectItem>
                  <SelectItem value='true'>true (allow any)</SelectItem>
                  <SelectItem value='false'>false (disallow)</SelectItem>
                  <SelectItem value='string'>string</SelectItem>
                  <SelectItem value='number'>number</SelectItem>
                  <SelectItem value='integer'>integer</SelectItem>
                  <SelectItem value='boolean'>boolean</SelectItem>
                  <SelectItem value='object'>object</SelectItem>
                  <SelectItem value='$ref'>$ref (schema)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {schema.additionalProperties?.enabled &&
              schema.additionalProperties.$ref !== undefined && (
                <SchemaRefPicker
                  value={schema.additionalProperties.$ref || ''}
                  onChange={(ref) =>
                    updateSchema((s) => ({
                      ...s,
                      additionalProperties: { ...s.additionalProperties!, $ref: ref },
                    }))
                  }
                  schemas={doc.schemas}
                  excludeSchema={schema.name}
                />
              )}
          </div>
        </SubSection>

        {/* Extensions */}
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={schema.extensions || {}}
            onChange={(extensions) => updateSchema((s) => ({ ...s, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Component Parameter ──
  const renderComponentParamPanel = (idx: number) => {
    const cp = doc.componentParameters[idx];
    if (!cp) return null;
    const update = (updater: (p: ComponentParameter) => ComponentParameter) => {
      updateDoc((d) => {
        const params = [...d.componentParameters];
        params[idx] = updater(params[idx]);
        return { ...d, componentParameters: params };
      });
    };
    return (
      <DetailPanel
        title={cp.name}
        icon={<Settings2 className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentParameters: d.componentParameters.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Component Key'>
            <Input
              value={cp.name}
              onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. PageSize'
            />
          </Field>
          <Field label='Parameter Name'>
            <Input
              value={cp.paramName}
              onChange={(e) => update((p) => ({ ...p, paramName: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. page_size'
            />
          </Field>
          <Field label='In'>
            <Select value={cp.in} onValueChange={(v) => update((p) => ({ ...p, in: v as any }))}>
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAM_LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Type'>
            <Select
              value={cp.schema?.type || 'string'}
              onValueChange={(v) => update((p) => ({ ...p, schema: { ...p.schema, type: v } }))}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_TYPES.filter((t) => t !== '$ref').map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Format'>
            <Input
              value={cp.schema?.format || ''}
              onChange={(e) =>
                update((p) => ({ ...p, schema: { ...p.schema, format: e.target.value } }))
              }
              className='h-9'
              placeholder='e.g. int32'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={cp.description || ''}
              onChange={(e) => update((p) => ({ ...p, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <div className='flex items-center gap-2 mt-3'>
          <Checkbox
            checked={!!cp.required}
            onCheckedChange={(c) => update((p) => ({ ...p, required: !!c }))}
          />
          <Label className='text-xs'>Required</Label>
        </div>
      </DetailPanel>
    );
  };

  // ── Component Response ──
  const renderComponentResponsePanel = (idx: number) => {
    const cr = doc.componentResponses[idx];
    if (!cr) return null;
    const update = (updater: (r: ComponentResponse) => ComponentResponse) => {
      updateDoc((d) => {
        const responses = [...d.componentResponses];
        responses[idx] = updater(responses[idx]);
        return { ...d, componentResponses: responses };
      });
    };
    return (
      <DetailPanel
        title={cr.name}
        icon={<FileText className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentResponses: d.componentResponses.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={cr.name}
              onChange={(e) => update((r) => ({ ...r, name: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. NotFound'
            />
          </Field>
          <Field label='Content Type'>
            <Select
              value={cr.contentType || '_none_'}
              onValueChange={(v) =>
                update((r) => ({ ...r, contentType: v === '_none_' ? undefined : v }))
              }
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='_none_'>
                  <span className='text-muted-foreground'>None</span>
                </SelectItem>
                {CONTENT_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Schema Mode'>
            <Select
              value={cr.schemaRef ? '$ref' : cr.inlineSchema ? 'inline' : 'none'}
              onValueChange={(v) => {
                if (v === '$ref') update((r) => ({ ...r, schemaRef: '', inlineSchema: undefined }));
                else if (v === 'inline')
                  update((r) => ({
                    ...r,
                    schemaRef: undefined,
                    inlineSchema: { type: 'object', properties: [] },
                  }));
                else update((r) => ({ ...r, schemaRef: undefined, inlineSchema: undefined }));
              }}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>
                  <span className='text-muted-foreground'>None</span>
                </SelectItem>
                <SelectItem value='$ref'>$ref (reference)</SelectItem>
                <SelectItem value='inline'>Inline (define here)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label='Description' full>
            <Textarea
              value={cr.description}
              onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
              className='min-h-[60px] text-sm'
              placeholder='Response description...'
            />
          </Field>
        </FieldGroup>
        {cr.schemaRef !== undefined && (
          <SubSection title='Schema ($ref)'>
            <SchemaRefPicker
              value={cr.schemaRef || ''}
              onChange={(ref) => update((r) => ({ ...r, schemaRef: ref || undefined }))}
              schemas={doc.schemas}
            />
          </SubSection>
        )}
        {cr.inlineSchema && (
          <SubSection title='Inline Schema Properties'>
            <InlinePropertyEditor
              schema={cr.inlineSchema}
              onChange={(inlineSchema) => update((r) => ({ ...r, inlineSchema }))}
              availableSchemas={doc.schemas}
            />
          </SubSection>
        )}
      </DetailPanel>
    );
  };

  // ── Component Request Body ──
  const renderComponentRequestBodyPanel = (idx: number) => {
    const rb = doc.componentRequestBodies[idx];
    if (!rb) return null;
    const update = (updater: (r: ComponentRequestBody) => ComponentRequestBody) => {
      updateDoc((d) => {
        const bodies = [...d.componentRequestBodies];
        bodies[idx] = updater(bodies[idx]);
        return { ...d, componentRequestBodies: bodies };
      });
    };
    return (
      <DetailPanel
        title={rb.name}
        icon={<FileText className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentRequestBodies: d.componentRequestBodies.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={rb.name}
              onChange={(e) => update((r) => ({ ...r, name: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. CreateUser'
            />
          </Field>
          <Field label='Content Type'>
            <Select
              value={rb.contentType || 'application/json'}
              onValueChange={(v) => update((r) => ({ ...r, contentType: v }))}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Schema Mode'>
            <Select
              value={rb.schemaRef ? '$ref' : rb.inlineSchema ? 'inline' : 'none'}
              onValueChange={(v) => {
                if (v === '$ref') update((r) => ({ ...r, schemaRef: '', inlineSchema: undefined }));
                else if (v === 'inline')
                  update((r) => ({
                    ...r,
                    schemaRef: undefined,
                    inlineSchema: { type: 'object', properties: [] },
                  }));
                else update((r) => ({ ...r, schemaRef: undefined, inlineSchema: undefined }));
              }}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>
                  <span className='text-muted-foreground'>None</span>
                </SelectItem>
                <SelectItem value='$ref'>$ref (reference)</SelectItem>
                <SelectItem value='inline'>Inline (define here)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label='Description' full>
            <Textarea
              value={rb.description || ''}
              onChange={(e) => update((r) => ({ ...r, description: e.target.value }))}
              className='min-h-[60px] text-sm'
              placeholder='Request body description...'
            />
          </Field>
        </FieldGroup>
        <div className='flex items-center gap-2 mt-3'>
          <Checkbox
            checked={!!rb.required}
            onCheckedChange={(c) => update((r) => ({ ...r, required: !!c }))}
          />
          <Label className='text-xs'>Required</Label>
        </div>
        {rb.schemaRef !== undefined && (
          <SubSection title='Schema ($ref)'>
            <SchemaRefPicker
              value={rb.schemaRef || ''}
              onChange={(ref) => update((r) => ({ ...r, schemaRef: ref || undefined }))}
              schemas={doc.schemas}
            />
          </SubSection>
        )}
        {rb.inlineSchema && (
          <SubSection title='Inline Schema Properties'>
            <InlinePropertyEditor
              schema={rb.inlineSchema}
              onChange={(inlineSchema) => update((r) => ({ ...r, inlineSchema }))}
              availableSchemas={doc.schemas}
            />
          </SubSection>
        )}
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={rb.extensions || {}}
            onChange={(extensions) => update((r) => ({ ...r, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };
  const renderComponentHeaderPanel = (idx: number) => {
    const ch = doc.componentHeaders[idx];
    if (!ch) return null;
    const update = (updater: (h: ComponentHeader) => ComponentHeader) => {
      updateDoc((d) => {
        const headers = [...d.componentHeaders];
        headers[idx] = updater(headers[idx]);
        return { ...d, componentHeaders: headers };
      });
    };
    return (
      <DetailPanel
        title={ch.name}
        icon={<Hash className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentHeaders: d.componentHeaders.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={ch.name}
              onChange={(e) => update((h) => ({ ...h, name: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. X-Rate-Limit'
            />
          </Field>
          <Field label='Type'>
            <Select
              value={ch.schema?.type || 'string'}
              onValueChange={(v) => update((h) => ({ ...h, schema: { ...h.schema, type: v } }))}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_TYPES.filter((t) => t !== '$ref').map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Format'>
            <Input
              value={ch.schema?.format || ''}
              onChange={(e) =>
                update((h) => ({ ...h, schema: { ...h.schema, format: e.target.value } }))
              }
              className='h-9'
              placeholder='e.g. int32'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={ch.description || ''}
              onChange={(e) => update((h) => ({ ...h, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <div className='flex items-center gap-2 mt-3'>
          <Checkbox
            checked={!!ch.required}
            onCheckedChange={(c) => update((h) => ({ ...h, required: !!c }))}
          />
          <Label className='text-xs'>Required</Label>
        </div>
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={ch.extensions || {}}
            onChange={(extensions) => update((h) => ({ ...h, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Component Example ──
  const renderComponentExamplePanel = (idx: number) => {
    const ex = doc.componentExamples[idx];
    if (!ex) return null;
    const update = (updater: (e: ComponentExample) => ComponentExample) => {
      updateDoc((d) => {
        const examples = [...d.componentExamples];
        examples[idx] = updater(examples[idx]);
        return { ...d, componentExamples: examples };
      });
    };
    return (
      <DetailPanel
        title={ex.name}
        icon={<List className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentExamples: d.componentExamples.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={ex.name}
              onChange={(e) => update((x) => ({ ...x, name: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Summary'>
            <Input
              value={ex.summary || ''}
              onChange={(e) => update((x) => ({ ...x, summary: e.target.value }))}
              className='h-9'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={ex.description || ''}
              onChange={(e) => update((x) => ({ ...x, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
          <Field label='Value (JSON)' full>
            <Textarea
              value={ex.value || ''}
              onChange={(e) => update((x) => ({ ...x, value: e.target.value }))}
              className='min-h-[100px] text-sm font-mono'
              placeholder='{"key": "value"}'
            />
          </Field>
        </FieldGroup>
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={ex.extensions || {}}
            onChange={(extensions) => update((x) => ({ ...x, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Component Link ──
  const renderComponentLinkPanel = (idx: number) => {
    const lk = doc.componentLinks[idx];
    if (!lk) return null;
    const update = (updater: (l: ComponentLink) => ComponentLink) => {
      updateDoc((d) => {
        const links = [...d.componentLinks];
        links[idx] = updater(links[idx]);
        return { ...d, componentLinks: links };
      });
    };
    return (
      <DetailPanel
        title={lk.name}
        icon={<Link className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentLinks: d.componentLinks.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={lk.name}
              onChange={(e) => update((l) => ({ ...l, name: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Operation ID'>
            <Input
              value={lk.operationId || ''}
              onChange={(e) => update((l) => ({ ...l, operationId: e.target.value }))}
              className='h-9 font-mono'
              placeholder='e.g. getUser'
            />
          </Field>
          <Field label='Operation Ref'>
            <Input
              value={lk.operationRef || ''}
              onChange={(e) => update((l) => ({ ...l, operationRef: e.target.value }))}
              className='h-9 font-mono'
              placeholder='#/paths/~1users~1{id}/get'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={lk.description || ''}
              onChange={(e) => update((l) => ({ ...l, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <SubSection
          title='Parameters'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() => update((l) => ({ ...l, parameters: { ...l.parameters, '': '' } }))}
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {Object.entries(lk.parameters || {}).map(([key, val], pi) => (
            <div key={pi} className='flex items-center gap-2'>
              <Input
                value={key}
                onChange={(e) =>
                  update((l) => {
                    const entries = Object.entries(l.parameters || {});
                    entries[pi] = [e.target.value, entries[pi][1]];
                    return { ...l, parameters: Object.fromEntries(entries) };
                  })
                }
                className='h-7 text-xs font-mono flex-1'
                placeholder='param name'
              />
              <span className='text-xs text-muted-foreground'>→</span>
              <Input
                value={val}
                onChange={(e) =>
                  update((l) => {
                    const entries = Object.entries(l.parameters || {});
                    entries[pi] = [entries[pi][0], e.target.value];
                    return { ...l, parameters: Object.fromEntries(entries) };
                  })
                }
                className='h-7 text-xs font-mono flex-1'
                placeholder='$response.body#/id'
              />
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5 text-destructive shrink-0'
                onClick={() =>
                  update((l) => {
                    const entries = Object.entries(l.parameters || {}).filter((_, j) => j !== pi);
                    return { ...l, parameters: Object.fromEntries(entries) };
                  })
                }
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            </div>
          ))}
          {(!lk.parameters || Object.keys(lk.parameters).length === 0) && (
            <EmptyState text='No parameters' small />
          )}
        </SubSection>
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={lk.extensions || {}}
            onChange={(extensions) => update((l) => ({ ...l, extensions }))}
          />
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Component Callback ──
  const renderComponentCallbackPanel = (idx: number) => {
    const cb = doc.componentCallbacks[idx];
    if (!cb) return null;
    return (
      <DetailPanel
        title={cb.name}
        icon={<Webhook className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                componentCallbacks: d.componentCallbacks.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={cb.name}
              onChange={(e) =>
                updateDoc((d) => {
                  const cbs = [...d.componentCallbacks];
                  cbs[idx] = { ...cbs[idx], name: e.target.value };
                  return { ...d, componentCallbacks: cbs };
                })
              }
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Expression'>
            <Input
              value={cb.expression}
              onChange={(e) =>
                updateDoc((d) => {
                  const cbs = [...d.componentCallbacks];
                  cbs[idx] = { ...cbs[idx], expression: e.target.value };
                  return { ...d, componentCallbacks: cbs };
                })
              }
              className='h-9 font-mono'
              placeholder='{$request.body#/callbackUrl}'
            />
          </Field>
        </FieldGroup>
        <SubSection title='Operations'>
          <div className='space-y-2'>
            {Object.entries(cb.operations).map(([method]) => (
              <div
                key={method}
                className='flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50'
                onClick={() => setActiveSection(`componentCallback:${idx}:${method}`)}
              >
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                    methodColors[method],
                  )}
                >
                  {method}
                </span>
                <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
              </div>
            ))}
            <button
              className='flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground w-full'
              onClick={() => {
                const available = HTTP_METHODS.filter((m) => !cb.operations[m]);
                if (available.length === 0) return;
                updateDoc((d) => {
                  const cbs = [...d.componentCallbacks];
                  cbs[idx] = {
                    ...cbs[idx],
                    operations: {
                      ...cbs[idx].operations,
                      [available[0]]: {
                        operationId: '',
                        summary: '',
                        tags: [],
                        parameters: [],
                        responses: [{ statusCode: '200', description: 'OK' }],
                      },
                    },
                  };
                  return { ...d, componentCallbacks: cbs };
                });
              }}
            >
              <Plus className='h-3 w-3' /> Add operation
            </button>
          </div>
        </SubSection>
        <SubSection title='Extensions (x-*)'>
          <ExtensionsEditor
            extensions={cb.extensions || {}}
            onChange={(extensions) =>
              updateDoc((d) => {
                const cbs = [...d.componentCallbacks];
                cbs[idx] = { ...cbs[idx], extensions };
                return { ...d, componentCallbacks: cbs };
              })
            }
          />
        </SubSection>
      </DetailPanel>
    );
  };

  const renderCallbackOperationPanel = (cbIdx: number, method: string) => {
    const cb = doc.componentCallbacks[cbIdx];
    const op = cb?.operations[method];
    if (!op) return null;
    const updateOp = (updater: (op: OpenApiOperation) => OpenApiOperation) => {
      updateDoc((d) => {
        const cbs = [...d.componentCallbacks];
        cbs[cbIdx] = {
          ...cbs[cbIdx],
          operations: {
            ...cbs[cbIdx].operations,
            [method]: updater(cbs[cbIdx].operations[method]),
          },
        };
        return { ...d, componentCallbacks: cbs };
      });
    };
    return (
      <DetailPanel
        title={
          <div className='flex items-center gap-2'>
            <Webhook className='h-4 w-4' />
            <span
              className={cn(
                'text-xs font-bold uppercase px-2 py-0.5 rounded',
                methodColors[method],
              )}
            >
              {method}
            </span>
            <span className='font-mono text-sm'>{cb.name}</span>
          </div>
        }
        icon={null}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => {
                const cbs = [...d.componentCallbacks];
                const ops = { ...cbs[cbIdx].operations };
                delete ops[method];
                cbs[cbIdx] = { ...cbs[cbIdx], operations: ops };
                return { ...d, componentCallbacks: cbs };
              });
              setActiveSection(`componentCallback:${cbIdx}`);
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Operation ID'>
            <Input
              value={op.operationId || ''}
              onChange={(e) => updateOp((o) => ({ ...o, operationId: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Summary'>
            <Input
              value={op.summary || ''}
              onChange={(e) => updateOp((o) => ({ ...o, summary: e.target.value }))}
              className='h-9'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={op.description || ''}
              onChange={(e) => updateOp((o) => ({ ...o, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <SubSection
          title='Request Body'
          action={
            !op.requestBody ? (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1'
                onClick={() =>
                  updateOp((o) => ({
                    ...o,
                    requestBody: { contentType: 'application/json', required: false },
                  }))
                }
              >
                <Plus className='h-3 w-3' /> Add
              </Button>
            ) : (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1 text-destructive'
                onClick={() => updateOp((o) => ({ ...o, requestBody: undefined }))}
              >
                <Trash2 className='h-3 w-3' /> Remove
              </Button>
            )
          }
        >
          {op.requestBody ? (
            <div className='border rounded-lg p-3 space-y-3 bg-muted/20'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Content Type</Label>
                  <Select
                    value={op.requestBody.contentType || 'application/json'}
                    onValueChange={(v) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, contentType: v },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema ($ref)</Label>
                  <SchemaRefPicker
                    value={op.requestBody.schemaRef || ''}
                    onChange={(ref) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, schemaRef: ref || undefined },
                      }))
                    }
                    schemas={doc.schemas}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text='No request body' small />
          )}
        </SubSection>
        <SubSection
          title='Responses'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateOp((o) => ({
                  ...o,
                  responses: [...(o.responses || []), { statusCode: '200', description: '' }],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {(op.responses || []).map((resp, ri) => (
            <div key={ri} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <Badge variant='outline' className='text-xs font-mono'>
                  {resp.statusCode}
                </Badge>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateOp((o) => ({
                      ...o,
                      responses: (o.responses || []).filter((_, j) => j !== ri),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Status Code</Label>
                  <Input
                    value={resp.statusCode}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], statusCode: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs font-mono'
                  />
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Description</Label>
                  <Input
                    value={resp.description}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], description: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs'
                  />
                </div>
              </div>
            </div>
          ))}
          {(!op.responses || op.responses.length === 0) && <EmptyState text='No responses' small />}
        </SubSection>
      </DetailPanel>
    );
  };

  // ── Security Scheme ──
  const renderSecuritySchemePanel = (idx: number) => {
    const ss = doc.securitySchemes[idx];
    if (!ss) return null;
    const update = (updater: (s: SecurityScheme) => SecurityScheme) => {
      updateDoc((d) => {
        const schemes = [...d.securitySchemes];
        schemes[idx] = updater(schemes[idx]);
        return { ...d, securitySchemes: schemes };
      });
    };

    return (
      <DetailPanel
        title={ss.name}
        icon={<Key className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({
                ...d,
                securitySchemes: d.securitySchemes.filter((_, i) => i !== idx),
              }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Name'>
            <Input
              value={ss.name}
              onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Type'>
            <Select
              value={ss.type}
              onValueChange={(v) => update((s) => ({ ...s, type: v as SecuritySchemeType }))}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_SCHEME_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Description' full>
            <Textarea
              value={ss.description || ''}
              onChange={(e) => update((s) => ({ ...s, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>

        {/* apiKey fields */}
        {ss.type === 'apiKey' && (
          <SubSection title='API Key Settings'>
            <FieldGroup>
              <Field label='Key Name'>
                <Input
                  value={ss.apiKeyName || ''}
                  onChange={(e) => update((s) => ({ ...s, apiKeyName: e.target.value }))}
                  className='h-9 font-mono'
                  placeholder='e.g. X-API-Key'
                />
              </Field>
              <Field label='In'>
                <Select
                  value={ss.apiKeyIn || 'header'}
                  onValueChange={(v) => update((s) => ({ ...s, apiKeyIn: v as any }))}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='header'>header</SelectItem>
                    <SelectItem value='query'>query</SelectItem>
                    <SelectItem value='cookie'>cookie</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </SubSection>
        )}

        {/* http fields */}
        {ss.type === 'http' && (
          <SubSection title='HTTP Settings'>
            <FieldGroup>
              <Field label='Scheme'>
                <Select
                  value={ss.httpScheme || 'bearer'}
                  onValueChange={(v) => update((s) => ({ ...s, httpScheme: v }))}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_AUTH_SCHEMES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label='Bearer Format'>
                <Input
                  value={ss.bearerFormat || ''}
                  onChange={(e) => update((s) => ({ ...s, bearerFormat: e.target.value }))}
                  className='h-9'
                  placeholder='e.g. JWT'
                />
              </Field>
            </FieldGroup>
          </SubSection>
        )}

        {/* oauth2 fields */}
        {ss.type === 'oauth2' && (
          <SubSection title='OAuth2 Flows'>
            {/* Authorization Code */}
            <div className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>Authorization Code</span>
                {!ss.oauth2Flows?.authorizationCode ? (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px]'
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        oauth2Flows: {
                          ...s.oauth2Flows,
                          authorizationCode: { authorizationUrl: '', tokenUrl: '' },
                        },
                      }))
                    }
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px] text-destructive'
                    onClick={() =>
                      update((s) => {
                        const flows = { ...s.oauth2Flows };
                        delete flows.authorizationCode;
                        return { ...s, oauth2Flows: flows };
                      })
                    }
                  >
                    Disable
                  </Button>
                )}
              </div>
              {ss.oauth2Flows?.authorizationCode && (
                <FieldGroup>
                  <Field label='Authorization URL'>
                    <Input
                      value={ss.oauth2Flows.authorizationCode.authorizationUrl || ''}
                      onChange={(e) =>
                        update((s) => ({
                          ...s,
                          oauth2Flows: {
                            ...s.oauth2Flows,
                            authorizationCode: {
                              ...s.oauth2Flows!.authorizationCode!,
                              authorizationUrl: e.target.value,
                            },
                          },
                        }))
                      }
                      className='h-8 text-xs'
                    />
                  </Field>
                  <Field label='Token URL'>
                    <Input
                      value={ss.oauth2Flows.authorizationCode.tokenUrl || ''}
                      onChange={(e) =>
                        update((s) => ({
                          ...s,
                          oauth2Flows: {
                            ...s.oauth2Flows,
                            authorizationCode: {
                              ...s.oauth2Flows!.authorizationCode!,
                              tokenUrl: e.target.value,
                            },
                          },
                        }))
                      }
                      className='h-8 text-xs'
                    />
                  </Field>
                </FieldGroup>
              )}
            </div>
            {/* Implicit */}
            <div className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>Implicit</span>
                {!ss.oauth2Flows?.implicit ? (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px]'
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        oauth2Flows: { ...s.oauth2Flows, implicit: { authorizationUrl: '' } },
                      }))
                    }
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px] text-destructive'
                    onClick={() =>
                      update((s) => {
                        const flows = { ...s.oauth2Flows };
                        delete flows.implicit;
                        return { ...s, oauth2Flows: flows };
                      })
                    }
                  >
                    Disable
                  </Button>
                )}
              </div>
              {ss.oauth2Flows?.implicit && (
                <Field label='Authorization URL'>
                  <Input
                    value={ss.oauth2Flows.implicit.authorizationUrl || ''}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        oauth2Flows: {
                          ...s.oauth2Flows,
                          implicit: {
                            ...s.oauth2Flows!.implicit!,
                            authorizationUrl: e.target.value,
                          },
                        },
                      }))
                    }
                    className='h-8 text-xs'
                  />
                </Field>
              )}
            </div>
            {/* Client Credentials */}
            <div className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground'>Client Credentials</span>
                {!ss.oauth2Flows?.clientCredentials ? (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px]'
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        oauth2Flows: { ...s.oauth2Flows, clientCredentials: { tokenUrl: '' } },
                      }))
                    }
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 text-[10px] text-destructive'
                    onClick={() =>
                      update((s) => {
                        const flows = { ...s.oauth2Flows };
                        delete flows.clientCredentials;
                        return { ...s, oauth2Flows: flows };
                      })
                    }
                  >
                    Disable
                  </Button>
                )}
              </div>
              {ss.oauth2Flows?.clientCredentials && (
                <Field label='Token URL'>
                  <Input
                    value={ss.oauth2Flows.clientCredentials.tokenUrl || ''}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        oauth2Flows: {
                          ...s.oauth2Flows,
                          clientCredentials: {
                            ...s.oauth2Flows!.clientCredentials!,
                            tokenUrl: e.target.value,
                          },
                        },
                      }))
                    }
                    className='h-8 text-xs'
                  />
                </Field>
              )}
            </div>
          </SubSection>
        )}

        {/* openIdConnect fields */}
        {ss.type === 'openIdConnect' && (
          <SubSection title='OpenID Connect'>
            <Field label='OpenID Connect URL'>
              <Input
                value={ss.openIdConnectUrl || ''}
                onChange={(e) => update((s) => ({ ...s, openIdConnectUrl: e.target.value }))}
                className='h-9 font-mono'
                placeholder='https://...'
              />
            </Field>
          </SubSection>
        )}
      </DetailPanel>
    );
  };

  // ── Webhook ──
  const renderWebhookPanel = (idx: number) => {
    const wh = doc.webhooks[idx];
    if (!wh) return null;
    return (
      <DetailPanel
        title={wh.name}
        icon={<Webhook className='h-4 w-4' />}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => ({ ...d, webhooks: d.webhooks.filter((_, i) => i !== idx) }));
              setActiveSection('info');
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <Field label='Name'>
          <Input
            value={wh.name}
            onChange={(e) =>
              updateDoc((d) => {
                const webhooks = [...d.webhooks];
                webhooks[idx] = { ...webhooks[idx], name: e.target.value };
                return { ...d, webhooks };
              })
            }
            className='h-9 font-mono'
          />
        </Field>
        <SubSection title='Operations'>
          <div className='space-y-2'>
            {Object.entries(wh.operations).map(([method]) => (
              <div
                key={method}
                className='flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50'
                onClick={() => setActiveSection(`webhook:${idx}:${method}`)}
              >
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                    methodColors[method],
                  )}
                >
                  {method}
                </span>
                <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
              </div>
            ))}
            <button
              className='flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground w-full'
              onClick={() => {
                const available = HTTP_METHODS.filter((m) => !wh.operations[m]);
                if (available.length === 0) return;
                updateDoc((d) => {
                  const webhooks = [...d.webhooks];
                  webhooks[idx] = {
                    ...webhooks[idx],
                    operations: {
                      ...webhooks[idx].operations,
                      [available[0]]: {
                        operationId: '',
                        summary: '',
                        tags: [],
                        parameters: [],
                        responses: [{ statusCode: '200', description: 'OK' }],
                      },
                    },
                  };
                  return { ...d, webhooks };
                });
              }}
            >
              <Plus className='h-3 w-3' /> Add operation
            </button>
          </div>
        </SubSection>
      </DetailPanel>
    );
  };

  const renderWebhookOperationPanel = (whIdx: number, method: string) => {
    const wh = doc.webhooks[whIdx];
    const op = wh?.operations[method];
    if (!op) return null;
    const updateOp = (updater: (op: OpenApiOperation) => OpenApiOperation) => {
      updateDoc((d) => {
        const webhooks = [...d.webhooks];
        webhooks[whIdx] = {
          ...webhooks[whIdx],
          operations: {
            ...webhooks[whIdx].operations,
            [method]: updater(webhooks[whIdx].operations[method]),
          },
        };
        return { ...d, webhooks };
      });
    };
    return (
      <DetailPanel
        title={
          <div className='flex items-center gap-2'>
            <Webhook className='h-4 w-4' />
            <span
              className={cn(
                'text-xs font-bold uppercase px-2 py-0.5 rounded',
                methodColors[method],
              )}
            >
              {method}
            </span>
            <span className='font-mono text-sm'>{wh.name}</span>
          </div>
        }
        icon={null}
        action={
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={() => {
              updateDoc((d) => {
                const webhooks = [...d.webhooks];
                const ops = { ...webhooks[whIdx].operations };
                delete ops[method];
                webhooks[whIdx] = { ...webhooks[whIdx], operations: ops };
                return { ...d, webhooks };
              });
              setActiveSection(`webhook:${whIdx}`);
            }}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        }
      >
        <FieldGroup>
          <Field label='Operation ID'>
            <Input
              value={op.operationId || ''}
              onChange={(e) => updateOp((o) => ({ ...o, operationId: e.target.value }))}
              className='h-9 font-mono'
            />
          </Field>
          <Field label='Summary'>
            <Input
              value={op.summary || ''}
              onChange={(e) => updateOp((o) => ({ ...o, summary: e.target.value }))}
              className='h-9'
            />
          </Field>
          <Field label='Description' full>
            <Textarea
              value={op.description || ''}
              onChange={(e) => updateOp((o) => ({ ...o, description: e.target.value }))}
              className='min-h-[60px] text-sm'
            />
          </Field>
        </FieldGroup>
        <SubSection
          title='Request Body'
          action={
            !op.requestBody ? (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1'
                onClick={() =>
                  updateOp((o) => ({
                    ...o,
                    requestBody: { contentType: 'application/json', required: false },
                  }))
                }
              >
                <Plus className='h-3 w-3' /> Add
              </Button>
            ) : (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 text-[11px] gap-1 text-destructive'
                onClick={() => updateOp((o) => ({ ...o, requestBody: undefined }))}
              >
                <Trash2 className='h-3 w-3' /> Remove
              </Button>
            )
          }
        >
          {op.requestBody ? (
            <div className='border rounded-lg p-3 space-y-3 bg-muted/20'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Content Type</Label>
                  <Select
                    value={op.requestBody.contentType || 'application/json'}
                    onValueChange={(v) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, contentType: v },
                      }))
                    }
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Schema ($ref)</Label>
                  <SchemaRefPicker
                    value={op.requestBody.schemaRef || ''}
                    onChange={(ref) =>
                      updateOp((o) => ({
                        ...o,
                        requestBody: { ...o.requestBody!, schemaRef: ref || undefined },
                      }))
                    }
                    schemas={doc.schemas}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text='No request body' small />
          )}
        </SubSection>
        <SubSection
          title='Responses'
          action={
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-[11px] gap-1'
              onClick={() =>
                updateOp((o) => ({
                  ...o,
                  responses: [...(o.responses || []), { statusCode: '200', description: '' }],
                }))
              }
            >
              <Plus className='h-3 w-3' /> Add
            </Button>
          }
        >
          {(op.responses || []).map((resp, ri) => (
            <div key={ri} className='border rounded-lg p-3 space-y-2 bg-muted/20'>
              <div className='flex items-center justify-between'>
                <Badge variant='outline' className='text-xs font-mono'>
                  {resp.statusCode}
                </Badge>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive'
                  onClick={() =>
                    updateOp((o) => ({
                      ...o,
                      responses: (o.responses || []).filter((_, j) => j !== ri),
                    }))
                  }
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Status Code</Label>
                  <Input
                    value={resp.statusCode}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], statusCode: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs font-mono'
                  />
                </div>
                <div>
                  <Label className='text-[10px] text-muted-foreground'>Description</Label>
                  <Input
                    value={resp.description}
                    onChange={(e) =>
                      updateOp((o) => {
                        const responses = [...(o.responses || [])];
                        responses[ri] = { ...responses[ri], description: e.target.value };
                        return { ...o, responses };
                      })
                    }
                    className='h-8 text-xs'
                  />
                </div>
              </div>
            </div>
          ))}
          {(!op.responses || op.responses.length === 0) && <EmptyState text='No responses' small />}
        </SubSection>
      </DetailPanel>
    );
  };

  if (!initialized) {
    return (
      <div className='h-full flex items-center justify-center text-muted-foreground text-sm'>
        Loading...
      </div>
    );
  }

  return (
    <div className='flex h-full'>
      {renderNav()}
      <div className='flex-1 min-w-0 overflow-y-auto'>{renderDetail()}</div>
    </div>
  );
};

// ─── Reusable UI Atoms ───────────────────────────────────────────────────────

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  mono?: boolean;
  small?: boolean;
}> = ({ icon, label, badge, active, onClick, className, mono, small }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 w-full text-left transition-colors',
      small ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
      active
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      mono && 'font-mono',
      className,
    )}
  >
    {icon}
    <span className='truncate flex-1'>{label}</span>
    {badge !== undefined && badge > 0 && (
      <Badge variant='secondary' className='text-[9px] px-1 py-0 h-4 font-mono'>
        {badge}
      </Badge>
    )}
  </button>
);

const DetailPanel: React.FC<{
  title: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, action, children }) => (
  <div className='p-5 space-y-5'>
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2.5'>
        {icon && (
          <div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
            {icon}
          </div>
        )}
        <h2 className='text-base font-bold'>{title}</h2>
      </div>
      {action}
    </div>
    <Separator />
    {children}
  </div>
);

const SubSection: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <div className='space-y-3 mt-4'>
    <div className='flex items-center justify-between'>
      <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>{title}</h3>
      {action}
    </div>
    <div className='space-y-3'>{children}</div>
  </div>
);

const FieldGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='grid grid-cols-2 gap-4'>{children}</div>
);
const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({
  label,
  full,
  children,
}) => (
  <div className={cn('space-y-1.5', full && 'col-span-2')}>
    <Label className='text-xs font-medium text-muted-foreground'>{label}</Label>
    {children}
  </div>
);
const EmptyState: React.FC<{ text: string; small?: boolean }> = ({ text, small }) => (
  <div
    className={cn(
      'border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground',
      small ? 'py-4 text-xs' : 'py-8 text-sm',
    )}
  >
    {text}
  </div>
);

export default OpenApiUiEditor;
