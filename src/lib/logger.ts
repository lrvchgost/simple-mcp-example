import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type LogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'critical'
  | 'alert'
  | 'emergency';

export interface McpLogger {
  log(level: LogLevel, message: string, data?: Record<string, unknown>): Promise<void>;
}

export function createMcpLogger(server: McpServer): McpLogger {
  return {
    log(level, message, data = {}) {
      return server.sendLoggingMessage({
        level,
        data: { message, ...data },
      });
    },
  };
}
