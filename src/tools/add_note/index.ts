import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { writeNote } from '../../lib/notes.js';
import type { McpLogger } from '../../lib/logger.js';

const addNoteSchema = {
  note_name: z.string().describe('имя файла в который будет сохранена заметка, расширение .md добавляется к имени файла'),
  text: z.string().describe('текст, который хочется сохранить в заметку'),
};

export type AddNoteArgs = { note_name: string; text: string };

export async function addNoteHandler(
  args: AddNoteArgs,
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const { fileName } = await writeNote(args.note_name, args.text, baseDir);
  return { content: [{ type: 'text', text: `Заметка сохранена: ${fileName}` }] };
}

export function registerAddNote(server: McpServer, logger: McpLogger): void {
  server.registerTool(
    'add_note',
    {
      description: 'Создаёт новую заметку (или перезаписывает существующую) в папке notes.',
      inputSchema: addNoteSchema,
    },
    async (args) => {
      await logger.log('info', 'add_note: start', { note_name: args.note_name });
      try {
        const result = await addNoteHandler(args);
        await logger.log('info', 'add_note: success', { note_name: args.note_name });
        return result;
      } catch (error) {
        await logger.log('error', 'add_note: error', { error: String(error) });
        throw error;
      }
    },
  );
}
