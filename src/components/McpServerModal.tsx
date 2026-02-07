import SimpleModal from "./SimpleModal";

interface McpServerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const McpServerModal: React.FC<McpServerModalProps> = ({ isOpen, onRequestClose }) => {
  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="70%" height="80%">
      <div className="text-gray-900 dark:text-gray-100">
        <h2 className="text-xl font-bold mb-4">MCP Server (Functions API)</h2>
        <p className="mb-4">
          This project includes a minimal Model Context Protocol (MCP) server that exposes
          openapi-format as callable tools. It is designed for HTTP/SSE and works well on Vercel.
        </p>

        <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
        <p className="mb-4">
          Use the built-in API route in this app:
          <br />
          <code>https://&lt;your-app-domain&gt;/api/mcp</code>
        </p>

        <h3 className="text-lg font-semibold mb-2">Quick Start</h3>
        <p className="mb-2">Use any MCP client to connect, then list and call tools.</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto">
          <code>{`1. Connect to the MCP endpoint
2. Initialize the session
3. List tools
4. Call format_openapi or share_openapi_format_link`}</code>
        </pre>

        <h3 className="text-lg font-semibold mb-2">Example Calls</h3>
        <p className="mb-2">format_openapi</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto">
          <code>{`{
  "openapi": "<openapi string>",
  "config": {
    "sort": true,
    "filterSet": "methods: [get, post]"
  }
}`}</code>
        </pre>
        <p className="mb-2">share_openapi_format_link</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto">
          <code>{`{
  "openapi": "<openapi string>",
  "config": {
    "sort": true,
    "format": "yaml"
  }
}`}</code>
        </pre>

        <h3 className="text-lg font-semibold mb-2">Tools</h3>
        <div className="space-y-1 mb-4">
          <div><code>generate_config_yaml</code> - Convert a config object to YAML.</div>
          <div><code>format_openapi</code> - Apply sort/filter/overlay/generate/casing/convert.</div>
          <div><code>convert_openapi_version</code> - Convert to OpenAPI 3.1 or 3.2.</div>
          <div><code>guide_openapi_format_config</code> - Guidance on config usage.</div>
          <div><code>share_openapi_format_link</code> - Generate playground share links.</div>
        </div>

        <h3 className="text-lg font-semibold mb-2">Notes</h3>
        <div className="space-y-1">
          <div>Config inputs accept JSON or YAML strings.</div>
          <div>Set <code>OPENAPI_FORMAT_PLAYGROUND_URL</code> to customize share links.</div>
        </div>
      </div>
    </SimpleModal>
  );
};

export default McpServerModal;
