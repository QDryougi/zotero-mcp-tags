import { StreamableMCPServer } from "./streamableMCPServer";

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

function getUtf8ByteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    let bytes = 0;
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code < 0x80) {
        bytes += 1;
      } else if (code < 0x800) {
        bytes += 2;
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes += 3;
      } else {
        index += 1;
        bytes += 4;
      }
    }
    return bytes;
  }
}

function writeUtf8(output: any, text: string) {
  const converter = Cc[
    "@mozilla.org/intl/converter-output-stream;1"
  ].createInstance(Ci.nsIConverterOutputStream);
  converter.init(output, "UTF-8", 0, 0);
  converter.writeString(text);
  converter.flush();
  converter.close();
}

export class HttpServer {
  private serverSocket: any = null;
  private readonly mcpServer = new StreamableMCPServer();
  private running = false;
  private activeTransports = new Set<any>();
  private port = 23124;
  private allowRemote = false;

  public start(port: number, allowRemote: boolean) {
    if (this.running) {
      this.stop();
    }

    this.port = port;
    this.allowRemote = allowRemote;
    this.serverSocket = Cc[
      "@mozilla.org/network/server-socket;1"
    ].createInstance(Ci.nsIServerSocket);
    this.serverSocket.init(port, !allowRemote, -1);
    this.serverSocket.asyncListen(this.listener);
    this.running = true;
  }

  public stop() {
    for (const transport of Array.from(this.activeTransports)) {
      try {
        transport.close(0);
      } catch {
        continue;
      }
    }
    this.activeTransports.clear();

    if (this.serverSocket) {
      try {
        this.serverSocket.close();
      } catch {
        // ignore close failures during shutdown
      }
      this.serverSocket = null;
    }

    this.running = false;
  }

  private readonly listener = {
    onSocketAccepted: async (_socket: any, transport: any) => {
      this.activeTransports.add(transport);

      let input: any = null;
      let output: any = null;
      let converterInput: any = null;
      let scriptableInput: any = null;

      try {
        input = transport.openInputStream(0, 0, 0);
        output = transport.openOutputStream(0, 0, 0);
        converterInput = Cc[
          "@mozilla.org/intl/converter-input-stream;1"
        ].createInstance(Ci.nsIConverterInputStream);
        converterInput.init(input, "UTF-8", 0, 0);
        scriptableInput = Cc[
          "@mozilla.org/scriptableinputstream;1"
        ].createInstance(Ci.nsIScriptableInputStream);
        scriptableInput.init(input);

        const requestText = await this.readRequest(
          input,
          converterInput,
          scriptableInput,
        );
        const response = await this.handleRequest(requestText);
        this.writeResponse(output, response);
      } catch (error) {
        if (output) {
          this.writeResponse(output, {
            status: 500,
            statusText: "Internal Server Error",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          });
        }
      } finally {
        this.activeTransports.delete(transport);
        try {
          scriptableInput?.close();
        } catch {
          // ignore input cleanup failures
        }
        try {
          converterInput?.close();
        } catch {
          // ignore converter cleanup failures
        }
        try {
          input?.close();
        } catch {
          // ignore input stream cleanup failures
        }
        try {
          output?.close();
        } catch {
          // ignore output stream cleanup failures
        }
        try {
          transport.close(0);
        } catch {
          // ignore transport cleanup failures
        }
      }
    },
    onStopListening: () => {},
  };

  private async readRequest(
    input: any,
    converterInput: any,
    scriptableInput: any,
  ) {
    let requestText = "";
    let bodyStart = -1;
    let contentLength = 0;
    let waitAttempts = 0;

    while (bodyStart === -1 && waitAttempts < 50) {
      const available = input.available();
      if (!available) {
        waitAttempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }

      requestText += this.readChunk(
        converterInput,
        scriptableInput,
        Math.min(available, 4096),
      );
      bodyStart = requestText.indexOf("\r\n\r\n");
    }

    if (bodyStart !== -1) {
      const headers = requestText.slice(0, bodyStart);
      const contentLengthMatch = headers.match(/Content-Length:\s*(\d+)/i);
      if (contentLengthMatch) {
        contentLength = Number(contentLengthMatch[1]);
      }

      const expectedLength = bodyStart + 4 + contentLength;
      waitAttempts = 0;
      while (requestText.length < expectedLength && waitAttempts < 50) {
        const available = input.available();
        if (!available) {
          waitAttempts += 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
          continue;
        }

        requestText += this.readChunk(
          converterInput,
          scriptableInput,
          Math.min(available, expectedLength - requestText.length),
        );
      }
    }

    return requestText;
  }

  private readChunk(converterInput: any, scriptableInput: any, length: number) {
    try {
      const result: { value?: string } = {};
      converterInput.readString(length, result);
      return result.value || "";
    } catch {
      return scriptableInput.read(length) || "";
    }
  }

  private async handleRequest(requestText: string): Promise<HttpResponse> {
    const requestLine = requestText.split("\r\n")[0];
    const [method, rawPath] = requestLine.split(" ");

    if (!method || !rawPath) {
      return this.plainResponse(400, "Bad Request", "Bad Request");
    }

    const url = new URL(rawPath, "http://127.0.0.1");
    const path = url.pathname;
    const bodyStart = requestText.indexOf("\r\n\r\n");
    const requestBody =
      bodyStart === -1 ? "" : requestText.slice(bodyStart + 4);

    if (path === "/mcp") {
      if (method === "GET") {
        return this.jsonResponse(200, {
          endpoint: "/mcp",
          transport: "streamable_http",
          tool: "write_tag",
          description:
            "Use zotero-mcp for search, then pass returned itemKey values here for batch tagging.",
        });
      }

      if (method === "POST") {
        return this.mcpServer.handleMCPRequest(requestBody);
      }

      return this.plainResponse(
        405,
        "Method Not Allowed",
        "Method Not Allowed",
        {
          Allow: "GET, POST",
        },
      );
    }

    if (path === "/mcp/status") {
      return this.jsonResponse(200, {
        running: this.running,
        port: this.port,
        allowRemote: this.allowRemote,
        endpoint: `${this.allowRemote ? "http://0.0.0.0" : "http://127.0.0.1"}:${this.port}/mcp`,
        mcp: this.mcpServer.getStatus(),
      });
    }

    return this.plainResponse(404, "Not Found", "Not Found");
  }

  private writeResponse(output: any, response: HttpResponse) {
    const bodyLength = getUtf8ByteLength(response.body);
    const headerLines = [
      `HTTP/1.1 ${response.status} ${response.statusText}`,
      `Content-Type: ${response.headers["Content-Type"] || "text/plain; charset=utf-8"}`,
      `Content-Length: ${bodyLength}`,
      "Connection: close",
    ];

    for (const [key, value] of Object.entries(response.headers)) {
      if (key.toLowerCase() !== "content-type") {
        headerLines.push(`${key}: ${value}`);
      }
    }

    const headerText = `${headerLines.join("\r\n")}\r\n\r\n`;
    output.write(headerText, headerText.length);
    if (bodyLength > 0) {
      writeUtf8(output, response.body);
    }
    try {
      output.flush();
    } catch {
      // flush is optional for some output stream implementations
    }
  }

  private jsonResponse(status: number, payload: any): HttpResponse {
    return {
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    };
  }

  private plainResponse(
    status: number,
    statusText: string,
    body: string,
    headers: Record<string, string> = {},
  ): HttpResponse {
    return {
      status,
      statusText,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...headers,
      },
      body,
    };
  }
}
