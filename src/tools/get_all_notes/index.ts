import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listNoteFiles, getNoteFileWithMtime } from '../../lib/notes.js';

export async function getAllNotesHandler(
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const files = await listNoteFiles(baseDir);
  const withMtime = await Promise.all(files.map((f) => getNoteFileWithMtime(f, baseDir)));
  const sorted = withMtime.sort((a, b) => a.mtime - b.mtime).map((f) => f.fileName);
  return { content: [{ type: 'text', text: sorted.join('\n') }] };
}

export function registerGetAllNotes(server: McpServer): void {
  server.registerTool(
    'get_all_notes',
    {
      description: 'Выводит список имен всех заметок, сортировка по дате (mtime файла) от старых к новым.',
      inputSchema: {},
    },
    async () => getAllNotesHandler(),
  );
}
