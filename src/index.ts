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
          properties: {},
        },
      },
      {
        name: "check_inbox",
        description:
          "Retrieve all messages currently in the inbox for a given temporary email address.",
        inputSchema: {
          type: "object",
          properties: {
            sid_token: {
              type: "string",
              description: "The session token returned by generate_email.",
            },
          },
          required: ["sid_token"],
        },
      },
      {
        name: "get_message",
        description:
          "Retrieve the full content of a specific message, including the HTML body and attachments metadata.",
        inputSchema: {
          type: "object",
          properties: {
            sid_token: {
              type: "string",
              description: "The session token returned by generate_email.",
            },
            message_id: {
              type: "string",
              description: "The message ID from check_inbox.",
            },
          },
          required: ["sid_token", "message_id"],
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
        const result = await callMcp("generate_email", {});
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
        const sidToken = args?.sid_token as string;
        if (!sidToken) {
          return {
            content: [{ type: "text", text: "Error: sid_token is required" }],
            isError: true,
          };
        }
        const result = await callMcp("check_inbox", { sid_token: sidToken });
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
        const sidToken = args?.sid_token as string;
        const messageId = args?.message_id as string;
        if (!sidToken || !messageId) {
          return {
            content: [
              {
                type: "text",
                text: "Error: sid_token and message_id are required",
              },
            ],
            isError: true,
          };
        }
        const result = await callMcp("get_message", {
          sid_token: sidToken,
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
