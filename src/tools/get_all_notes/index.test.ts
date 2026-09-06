import { mkdtemp, stat, writeFile, utimes, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getAllNotesHandler } from './index.js';

describe('get_all_notes', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-list-'));
  });

  it('возвращает имена заметок, отсортированные по mtime от старых к новым', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'новый.md'), 'новый');
    await writeFile(path.join(notesDir, 'старый.md'), 'старый');
    await writeFile(path.join(notesDir, 'средний.md'), 'средний');

    const now = Date.now();
    await utimes(path.join(notesDir, 'старый.md'), new Date(now - 20000), new Date(now - 20000));
    await utimes(path.join(notesDir, 'средний.md'), new Date(now - 10000), new Date(now - 10000));
    await utimes(path.join(notesDir, 'новый.md'), new Date(now), new Date(now));

    const result = await getAllNotesHandler(dir);
    expect(result.content[0].text).toBe('старый.md\nсредний.md\nновый.md');
  });

  it('включает заметки с расширением .MD и сортирует их по mtime', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'ПОЗЖЕ.MD'), 'x');
    await writeFile(path.join(notesDir, 'раньше.md'), 'x');

    const now = Date.now();
    await utimes(path.join(notesDir, 'раньше.md'), new Date(now - 10000), new Date(now - 10000));
    await utimes(path.join(notesDir, 'ПОЗЖЕ.MD'), new Date(now), new Date(now));

    const result = await getAllNotesHandler(dir);
    expect(result.content[0].text).toBe('раньше.md\nПОЗЖЕ.MD');
  });

  it('создаёт папку notes и возвращает пустую строку, если папки нет', async () => {
    const result = await getAllNotesHandler(dir);
    expect(result.content[0].text).toBe('');
    await expect(stat(path.join(dir, 'notes'))).resolves.toBeDefined();
  });

  it('игнорирует файлы с не .md расширением', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'note.md'), 'x');
    await writeFile(path.join(notesDir, 'note.txt'), 'x');

    const result = await getAllNotesHandler(dir);
    expect(result.content[0].text).toBe('note.md');
  });
});
