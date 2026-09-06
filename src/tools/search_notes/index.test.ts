import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { searchNotesHandler } from './index.js';

describe('search_notes', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-search-'));
  });

  it('ищет по имени файла регистронезависимо', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'Встреча.md'), 'x');
    await writeFile(path.join(notesDir, 'идеи.md'), 'x');
    await writeFile(path.join(notesDir, 'рецепт.md'), 'x');

    const result = await searchNotesHandler({ pattern: 'ВСТРЕ' }, dir);
    expect(result.content[0].text).toBe('Встреча.md');
  });

  it('возвращает пустую строку, если совпадений нет', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'идеи.md'), 'x');

    const result = await searchNotesHandler({ pattern: 'неттакого' }, dir);
    expect(result.content[0].text).toBe('');
  });
});
