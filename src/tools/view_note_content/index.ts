import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readNoteContent } from '../../lib/notes.js';

const viewNoteContentSchema = {
  note_name: z.string().describe('имя заметки'),
};

export type ViewNoteContentArgs = { note_name: string };

export async function viewNoteContentHandler(
  args: ViewNoteContentArgs,
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const text = await readNoteContent(args.note_name, baseDir);
  return { content: [{ type: 'text', text }] };
}

export function registerViewNoteContent(server: McpServer): void {
  server.registerTool(
    'view_note_content',
    {
      description: 'Возвращает текст заметки.',
      inputSchema: viewNoteContentSchema,
    },
    async (args) => viewNoteContentHandler(args),
  );
}
