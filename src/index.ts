#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env["1TEMPMAIL_API_BASE"] || "https://www.1tempmail.com";
const API_KEY = process.env["1TEMPMAIL_API_KEY"] || "";

const server = new Server(
  {
    name: "1tempmail",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_email",
        description:
          "Generate a new temporary email address. The email remains active for 60 minutes and can receive messages during that time.",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description:
                "Preferred domain for the email address. If omitted, a random domain is assigned.",
            },
          },
        },
      },
      {
        name: "check_inbox",
        description:
          "Retrieve all messages currently in the inbox for a given temporary email address.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "The session token returned by generate_email.",
            },
          },
          required: ["token"],
        },
      },
      {
        name: "get_message",
        description:
          "Retrieve the full content of a specific message, including the HTML body and attachments metadata.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "The session token returned by generate_email.",
            },
            message_id: {
              type: "string",
              description: "The message ID from check_inbox.",
            },
          },
          required: ["token", "message_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!API_KEY) {
    return {
      content: [
        {
          type: "text",
          text: "Error: 1TEMPMAIL_API_KEY environment variable is not set. Get your API key at https://www.1tempmail.com/api",
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "generate_email": {
        const params: Record<string, unknown> = {};
        const domain = args?.domain as string | undefined;
        if (domain) {
          params.domain = domain;
        }
        const result = await callMcp("generate_email", params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "check_inbox": {
        const token = args?.token as string;
        if (!token) {
          return {
            content: [{ type: "text", text: "Error: token is required" }],
            isError: true,
          };
        }
        const result = await callMcp("check_inbox", { token });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_message": {
        const token = args?.token as string;
        const messageId = args?.message_id as string;
        if (!token || !messageId) {
          return {
            content: [
              {
                type: "text",
                text: "Error: token and message_id are required",
              },
            ],
            isError: true,
          };
        }
        const result = await callMcp("get_message", {
          token,
          message_id: messageId,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function callMcp(toolName: string, params: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    result?: { content?: Array<{ text?: string }> };
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(data.error.message || "Unknown error from server");
  }

  const textContent = data.result?.content?.[0]?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent);
    } catch {
      return textContent;
    }
  }

  return data.result;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("1TempMail MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
