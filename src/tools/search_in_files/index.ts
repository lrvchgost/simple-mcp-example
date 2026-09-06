import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotesDir, listNoteFiles } from '../../lib/notes.js';

const searchInFilesSchema = {
  pattern: z.string().describe('паттерн для поиска в содержимом файлов'),
};

export type SearchInFilesArgs = { pattern: string };

function extractHeader(content: string): { author: string; date: string } {
  const lines = content.split('\n');
  const author = (lines[0] ?? '').replace(/^Автор:\s*/, '');
  const date = (lines[1] ?? '').replace(/^Дата:\s*/, '');
  return { author, date };
}

function boldPattern(line: string, pattern: string): string {
  if (!pattern) {
    return line;
  }
  const lower = pattern.toLowerCase();
  const lowerLine = line.toLowerCase();
  let result = '';
  let lastIndex = 0;
  let index = lowerLine.indexOf(lower);
  while (index !== -1) {
    result += line.slice(lastIndex, index);
    result += `**${line.slice(index, index + pattern.length)}**`;
    lastIndex = index + pattern.length;
    index = lowerLine.indexOf(lower, lastIndex);
  }
  result += line.slice(lastIndex);
  return result;
}

function searchLines(lines: string[], pattern: string, context = 2): string[] {
  const lower = pattern.toLowerCase();
  const matched: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(lower)) {
      matched.push(i);
    }
  }
  if (matched.length === 0) {
    return [];
  }
  const matchedSet = new Set(matched);
  const indices = new Set<number>();
  for (const i of matched) {
    for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
      indices.add(j);
    }
  }
  return [...indices].sort((a, b) => a - b).map((i) =>
    matchedSet.has(i) ? boldPattern(lines[i], pattern) : lines[i],
  );
}

export async function searchInFilesHandler(
  args: SearchInFilesArgs,
  baseDir: string = process.cwd(),
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const files = await listNoteFiles(baseDir);
  const notesDir = getNotesDir(baseDir);
  const blocks: string[] = [];

  for (const fileName of files) {
    const filePath = path.join(notesDir, fileName);
    const content = await readFile(filePath, 'utf8');
    const { author, date } = extractHeader(content);
    const bodyLines = content.split('\n').slice(3);
    const contextLines = searchLines(bodyLines, args.pattern);
    if (contextLines.length === 0) {
      continue;
    }
    blocks.push(
      [`Файл: ${fileName}`, `Автор: ${author}`, `Дата: ${date}`, '', contextLines.join('\n')].join('\n'),
    );
  }

  return { content: [{ type: 'text', text: blocks.join('\n\n') }] };
}

export function registerSearchInFiles(server: McpServer): void {
  server.registerTool(
    'search_in_files',
    {
      description:
        'Возвращает список файлов, в содержимом которых есть искомый паттерн (регистронезависимо), и для каждого файла автор, дату и найденную строку ±2 строки контекста, паттерн обернут в bold.',
      inputSchema: searchInFilesSchema,
    },
    async (args) => searchInFilesHandler(args),
  );
}
