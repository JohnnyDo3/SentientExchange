#!/usr/bin/env node
/**
 * MCP Bridge - Connects Claude Desktop (stdio) to remote SSE MCP server
 *
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "sentientexchange": {
 *       "command": "node",
 *       "args": ["C:/Users/johnn/Desktop/agentMarket-mcp/bridge.js"]
 *     }
 *   }
 * }
 */

const REMOTE_SSE_URL = 'https://www.sentientexchange.com/mcp/sse';

// Read from stdin (Claude Desktop)
let buffer = '';
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();

  // Process complete JSON-RPC messages (separated by newlines)
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);

        // Forward to remote SSE server
        const response = await fetch(REMOTE_SSE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();

        // Send response back to Claude Desktop (stdout)
        process.stdout.write(JSON.stringify(result) + '\n');
      } catch (error) {
        // Send error response
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Bridge error: ${error.message}`,
          },
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Bridge error:', error);
  process.exit(1);
});
