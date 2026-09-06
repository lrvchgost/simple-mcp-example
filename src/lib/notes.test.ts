import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildNoteContent,
  ensureNotesDir,
  formatDate,
  getAuthor,
  getNotesDir,
  listNoteFiles,
  readNoteContent,
  resolveNotePath,
  writeNote,
} from './notes.js';

describe('formatDate', () => {
  it('форматирует дату в dd.mm.yyyy HH:mm', () => {
    const date = new Date(2026, 8, 6, 14, 30);
    expect(formatDate(date)).toBe('06.09.2026 14:30');
  });

  it('дополняет нулями однозначные значения', () => {
    const date = new Date(2026, 0, 5, 3, 7);
    expect(formatDate(date)).toBe('05.01.2026 03:07');
  });
});

describe('getAuthor', () => {
  it('возвращает имя пользователя из окружения', () => {
    expect(typeof getAuthor()).toBe('string');
    expect(getAuthor().length).toBeGreaterThan(0);
  });
});

describe('getNotesDir', () => {
  it('возвращает путь к папке notes внутри baseDir', () => {
    expect(getNotesDir('/tmp/foo')).toBe(path.join('/tmp/foo', 'notes'));
  });
});

describe('ensureNotesDir', () => {
  it('создаёт папку notes, если её нет', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'notes-lib-'));
    const notesDir = await ensureNotesDir(dir);
    expect(notesDir).toBe(path.join(dir, 'notes'));
    await expect(listNoteFiles(dir)).resolves.toEqual([]);
  });
});

describe('resolveNotePath', () => {
  it('добавляет расширение .md', () => {
    expect(resolveNotePath('заметка', '/tmp/foo')).toBe(path.join('/tmp/foo', 'notes', 'заметка.md'));
  });

  it('не дублирует расширение .md', () => {
    expect(resolveNotePath('заметка.md', '/tmp/foo')).toBe(path.join('/tmp/foo', 'notes', 'заметка.md'));
  });

  it('отклоняет path traversal', () => {
    expect(() => resolveNotePath('../secret', '/tmp/foo')).toThrow();
    expect(() => resolveNotePath('/abs/path', '/tmp/foo')).toThrow();
  });

  it('отклоняет пустое имя', () => {
    expect(() => resolveNotePath('', '/tmp/foo')).toThrow();
  });
});

describe('buildNoteContent', () => {
  it('формирует структуру заметки с автором и датой', () => {
    const date = new Date(2026, 8, 6, 14, 30);
    const content = buildNoteContent('roman', date, 'текст');
    expect(content).toBe('Автор: roman\nДата: 06.09.2026 14:30\n\nтекст');
  });
});

describe('writeNote / readNoteContent', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-lib-'));
  });

  it('пишет и читает заметку', async () => {
    const { fileName } = await writeNote('встреча', 'текст заметки', dir);
    expect(fileName).toBe('встреча.md');
    const content = await readNoteContent('встреча', dir);
    expect(content).toContain('текст заметки');
    expect(content).toContain('Автор:');
    expect(content).toContain('Дата:');
  });

  it('listNoteFiles возвращает только .md файлы', async () => {
    await writeNote('первая', 'один', dir);
    await writeNote('вторая', 'два', dir);
    await writeFile(path.join(dir, 'notes', 'не_заметка.txt'), 'игнор');
    const files = await listNoteFiles(dir);
    expect(files).toEqual(expect.arrayContaining(['первая.md', 'вторая.md']));
    expect(files).not.toContain('не_заметка.txt');
  });
});
