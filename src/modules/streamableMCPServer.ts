import { tagService } from "./tagService";

interface MCPRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class StreamableMCPServer {
  private readonly serverInfo = {
    name: "zotero-mcp-tags",
    version: "0.1.1",
  };

  private initialized = false;

  public async handleMCPRequest(requestBody: string) {
    let parsedRequest: unknown;

    try {
      parsedRequest = JSON.parse(requestBody);
    } catch {
      return this.httpResponse(
        400,
        this.createError(null, -32700, "Parse error"),
      );
    }

    if (
      Array.isArray(parsedRequest) ||
      !parsedRequest ||
      typeof parsedRequest !== "object"
    ) {
      return this.httpResponse(
        400,
        this.createError(null, -32600, "Invalid Request"),
      );
    }

    const request = parsedRequest as MCPRequest;
    if (
      typeof request.method !== "string" ||
      request.method.trim().length === 0
    ) {
      return this.httpResponse(
        400,
        this.createError(
          request.id ?? null,
          -32600,
          "Invalid Request: method is required",
        ),
      );
    }

    const response = await this.processRequest(request);
    if (response === null) {
      return {
        status: 202,
        statusText: "Accepted",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: "",
      };
    }

    const status = response.error && response.error.code === -32600 ? 400 : 200;
    return this.httpResponse(status, response);
  }

  public getStatus() {
    return {
      initialized: this.initialized,
      serverInfo: this.serverInfo,
      protocolVersion: "2024-11-05",
      tools: ["add_tag", "remove_tag", "set_tag"],
    };
  }

  private async processRequest(
    request: MCPRequest,
  ): Promise<MCPResponse | null> {
    if (!Object.prototype.hasOwnProperty.call(request, "id")) {
      if (
        request.method === "initialized" ||
        request.method === "notifications/initialized"
      ) {
        this.initialized = true;
        return null;
      }

      if (request.method.startsWith("notifications/")) {
        return null;
      }

      return this.createError(
        null,
        -32600,
        `Invalid Request: id is required for ${request.method}`,
      );
    }

    switch (request.method) {
      case "initialize":
        return this.createResponse(request.id ?? null, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false,
            },
            prompts: {},
            resources: {},
            logging: {},
          },
          serverInfo: this.serverInfo,
        });
      case "initialized":
      case "notifications/initialized":
        this.initialized = true;
        return this.createResponse(request.id ?? null, { success: true });
      case "ping":
        return this.createResponse(request.id ?? null, {});
      case "resources/list":
        return this.createResponse(request.id ?? null, { resources: [] });
      case "prompts/list":
        return this.createResponse(request.id ?? null, { prompts: [] });
      case "tools/list":
        return this.createResponse(request.id ?? null, {
          tools: [
            {
              name: "add_tag",
              description:
                "Batch add tags to Zotero items. Designed to work with itemKey values returned by zotero-mcp search tools.",
              inputSchema: {
                type: "object",
                properties: {
                  itemKey: {
                    type: "string",
                    description: "Single Zotero item key",
                  },
                  itemKeys: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Multiple Zotero item keys, ideal for batch tagging after zotero-mcp search results",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags to add",
                  },
                  libraryID: {
                    type: "number",
                    description:
                      "Optional library ID. If omitted, the plugin searches all available libraries.",
                  },
                  tagType: {
                    type: "number",
                    enum: [0, 1],
                    description:
                      "0 for regular tags, 1 for automatic tags. Defaults to 0.",
                  },
                },
                required: ["tags"],
              },
            },
            {
              name: "remove_tag",
              description:
                "Batch remove tags from Zotero items. This is destructive and should require user confirmation in clients like OpenCode.",
              inputSchema: {
                type: "object",
                properties: {
                  itemKey: {
                    type: "string",
                    description: "Single Zotero item key",
                  },
                  itemKeys: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Multiple Zotero item keys, ideal for batch tag cleanup after zotero-mcp search results",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags to remove",
                  },
                  libraryID: {
                    type: "number",
                    description:
                      "Optional library ID. If omitted, the plugin searches all available libraries.",
                  },
                },
                required: ["tags"],
              },
            },
            {
              name: "set_tag",
              description:
                "Replace all existing tags on Zotero items with the provided list. This is destructive and should require user confirmation in clients like OpenCode.",
              inputSchema: {
                type: "object",
                properties: {
                  itemKey: {
                    type: "string",
                    description: "Single Zotero item key",
                  },
                  itemKeys: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Multiple Zotero item keys, ideal for batch retagging after zotero-mcp search results",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Complete replacement tag list",
                  },
                  libraryID: {
                    type: "number",
                    description:
                      "Optional library ID. If omitted, the plugin searches all available libraries.",
                  },
                  tagType: {
                    type: "number",
                    description:
                      "0 for regular tags, 1 for automatic tags. Defaults to 0.",
                  },
                },
                required: ["tags"],
              },
            },
          ],
        });
      case "tools/call":
        return this.handleToolCall(request);
      default:
        return this.createError(
          request.id ?? null,
          -32601,
          `Method not found: ${request.method}`,
        );
    }
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    const toolName = request.params?.name;
    const args = request.params?.arguments || {};

    try {
      const result = await this.callTagTool(toolName, args);
      return this.createResponse(request.id ?? null, {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
        isError: !result.success,
      });
    } catch (error) {
      return this.createError(
        request.id ?? null,
        -32603,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async callTagTool(name: string, args: any) {
    switch (name) {
      case "add_tag":
        return tagService.addTags(args);
      case "remove_tag":
        return tagService.removeTags(args);
      case "set_tag":
        return tagService.setTags(args);
      default:
        throw new Error(`Unknown tool: ${String(name)}`);
    }
  }

  private httpResponse(status: number, body: MCPResponse) {
    return {
      status,
      statusText: status === 400 ? "Bad Request" : "OK",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    };
  }

  private createResponse(id: string | number | null, result: any): MCPResponse {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }

  private createError(
    id: string | number | null,
    code: number,
    message: string,
    data?: any,
  ): MCPResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }
}
