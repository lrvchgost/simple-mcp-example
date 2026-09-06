import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { viewNoteContentHandler } from './index.js';

describe('view_note_content', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-view-'));
  });

  it('возвращает текст заметки', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'заметка.md'), 'Автор: roman\nДата: 06.09.2026 14:30\n\nТекст заметки');

    const result = await viewNoteContentHandler({ note_name: 'заметка' }, dir);
    expect(result.content[0].text).toBe('Автор: roman\nДата: 06.09.2026 14:30\n\nТекст заметки');
  });

  it('читает заметку при имени с расширением .md', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'заметка.md'), 'Автор: roman\nДата: 06.09.2026 14:30\n\nтекст');

    const result = await viewNoteContentHandler({ note_name: 'заметка.md' }, dir);
    expect(result.content[0].text).toContain('текст');
  });

  it('отклоняет path traversal', async () => {
    await expect(viewNoteContentHandler({ note_name: '../secret' }, dir)).rejects.toThrow('path separators');
  });

  it('отклоняет backslash traversal', async () => {
    await expect(viewNoteContentHandler({ note_name: '..\\secret' }, dir)).rejects.toThrow('path separators');
  });

  it('отклоняет абсолютный путь', async () => {
    await expect(viewNoteContentHandler({ note_name: '/etc/passwd' }, dir)).rejects.toThrow();
  });

  it('бросает ошибку, если заметка не существует', async () => {
    await expect(viewNoteContentHandler({ note_name: 'нет_такой' }, dir)).rejects.toThrow();
  });
});
