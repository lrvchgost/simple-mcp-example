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

  it('возвращает несколько совпадений, каждое на новой строке', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'проект-альфа.md'), 'x');
    await writeFile(path.join(notesDir, 'бета.md'), 'x');
    await writeFile(path.join(notesDir, 'проект-гамма.md'), 'x');

    const result = await searchNotesHandler({ pattern: 'ПРОЕКТ' }, dir);
    const lines = result.content[0].text.split('\n');
    expect(lines).toEqual(expect.arrayContaining(['проект-альфа.md', 'проект-гамма.md']));
    expect(lines).not.toContain('бета.md');
  });

  it('обрезает пробелы вокруг паттерна перед поиском', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'Встреча.md'), 'x');

    const result = await searchNotesHandler({ pattern: '  встре  ' }, dir);
    expect(result.content[0].text).toBe('Встреча.md');
  });

  it('отклоняет пустой паттерн', async () => {
    await expect(searchNotesHandler({ pattern: '' }, dir)).rejects.toThrow('pattern must not be empty');
  });

  it('отклоняет паттерн из пробелов', async () => {
    await expect(searchNotesHandler({ pattern: '   ' }, dir)).rejects.toThrow('pattern must not be empty');
  });

  it('возвращает пустую строку, если совпадений нет', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'идеи.md'), 'x');

    const result = await searchNotesHandler({ pattern: 'неттакого' }, dir);
    expect(result.content[0].text).toBe('');
  });
});
