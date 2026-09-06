import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listNoteFiles } from '../../lib/notes.js';

const searchNotesSchema = {
  pattern: z.string().describe('паттерн (регистронезависимый) для поиска в названиях файлов'),
};

export type SearchNotesArgs = { pattern: string };

export async function searchNotesHandler(
  args: SearchNotesArgs,
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const files = await listNoteFiles(baseDir);
  const lower = args.pattern.toLowerCase();
  const matches = files.filter((name) => name.toLowerCase().includes(lower));
  return { content: [{ type: 'text', text: matches.join('\n') }] };
}

export function registerSearchNotes(server: McpServer): void {
  server.registerTool(
    'search_notes',
    {
      description: 'Возвращает список файлов, в именах которых есть искомый паттерн (регистронезависимо).',
      inputSchema: searchNotesSchema,
    },
    async (args) => searchNotesHandler(args),
  );
}
