import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listNoteFiles } from '../../lib/notes.js';
import type { McpLogger } from '../../lib/logger.js';

const searchNotesSchema = {
  pattern: z.string().describe('паттерн (регистронезависимый) для поиска в названиях файлов'),
};

export type SearchNotesArgs = { pattern: string };

export async function searchNotesHandler(
  args: SearchNotesArgs,
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const pattern = args.pattern.trim();
  if (!pattern) {
    throw new Error('pattern must not be empty');
  }
  const files = await listNoteFiles(baseDir);
  const lower = pattern.toLowerCase();
  const matches = files.filter((name) => name.toLowerCase().includes(lower));
  return { content: [{ type: 'text', text: matches.join('\n') }] };
}

export function registerSearchNotes(server: McpServer, logger: McpLogger): void {
  server.registerTool(
    'search_notes',
    {
      description: 'Возвращает список файлов, в именах которых есть искомый паттерн (регистронезависимо).',
      inputSchema: searchNotesSchema,
    },
    async (args) => {
      await logger.log('info', 'search_notes: start', { pattern: args.pattern });
      try {
        const result = await searchNotesHandler(args);
        await logger.log('info', 'search_notes: success', { pattern: args.pattern });
        return result;
      } catch (error) {
        await logger.log('error', 'search_notes: error', { error: String(error) });
        throw error;
      }
    },
  );
}
