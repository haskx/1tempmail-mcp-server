# @1tempmail/mcp-server

MCP Server for [1TempMail](https://www.1tempmail.com) — Generate temporary emails, check inboxes, and read messages via AI assistants.

## Install

```bash
npm install -g @1tempmail/mcp-server
```

Or use directly with npx (no install needed):

```bash
npx -y @1tempmail/mcp-server
```

## Get Your API Key

1. Visit [https://www.1tempmail.com/api/](https://www.1tempmail.com/api/)
2. Sign in with Google
3. Click "Generate API Key"
4. Copy your API key

## Configuration

Set the `1TEMPMAIL_API_KEY` environment variable:

```bash
export 1TEMPMAIL_API_KEY="your_api_key_here"
```

## Usage with AI Tools

### Claude Code

Add to `~/.claude/settings.json` or your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "1tempmail": {
      "command": "npx",
      "args": ["-y", "@1tempmail/mcp-server"],
      "env": {
        "1TEMPMAIL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "1tempmail": {
      "command": "npx",
      "args": ["-y", "@1tempmail/mcp-server"],
      "env": {
        "1TEMPMAIL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Other MCP-Compatible Tools (Windsurf, Cline, etc.)

Add the same server config to your tool's MCP settings file.

## Tools

| Tool | Description |
|------|-------------|
| `generate_email` | Generate a new temporary email address (active for 60 minutes) |
| `check_inbox` | Retrieve all messages in the inbox for a given session token |
| `get_message` | Retrieve the full content of a specific message |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `1TEMPMAIL_API_KEY` | Yes | — | Your 1TempMail API key |
| `1TEMPMAIL_API_BASE` | No | `https://www.1tempmail.com` | API base URL |

## License

MIT
