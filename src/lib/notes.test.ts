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
  const originalUser = process.env.USER;
  const originalUsername = process.env.USERNAME;

  afterAll(() => {
    if (originalUser !== undefined) process.env.USER = originalUser;
    else delete process.env.USER;
    if (originalUsername !== undefined) process.env.USERNAME = originalUsername;
    else delete process.env.USERNAME;
  });

  function unsetBoth(): void {
    delete process.env.USER;
    delete process.env.USERNAME;
  }

  it('возвращает USER, если он задан', () => {
    unsetBoth();
    process.env.USER = 'testuser';
    expect(getAuthor()).toBe('testuser');
  });

  it('использует USERNAME, когда USER не задан', () => {
    unsetBoth();
    process.env.USERNAME = 'winuser';
    expect(getAuthor()).toBe('winuser');
  });

  it('возвращает unknown, когда USER и USERNAME не заданы', () => {
    unsetBoth();
    expect(getAuthor()).toBe('unknown');
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

  it('нормализует расширение .MD к нижнему регистру .md', () => {
    expect(resolveNotePath('Заметка.MD', '/tmp/foo')).toBe(path.join('/tmp/foo', 'notes', 'Заметка.md'));
  });

  it('отклоняет path traversal', () => {
    expect(() => resolveNotePath('../secret', '/tmp/foo')).toThrow();
    expect(() => resolveNotePath('/abs/path', '/tmp/foo')).toThrow();
  });

  it('отклоняет backslash traversal', () => {
    expect(() => resolveNotePath('..\\secret', '/tmp/foo')).toThrow('path separators');
    expect(() => resolveNotePath('..\\..\\etc', '/tmp/foo')).toThrow('path separators');
  });

  it('отклоняет вложенный traversal и абсолютный Windows-путь', () => {
    expect(() => resolveNotePath('sub/../../secret', '/tmp/foo')).toThrow();
    expect(() => resolveNotePath('C:\\Windows\\system32', '/tmp/foo')).toThrow('path separators');
  });

  it('отклоняет пустое имя', () => {
    expect(() => resolveNotePath('', '/tmp/foo')).toThrow('note_name must not be empty');
  });

  it('отклоняет имя из одних пробелов', () => {
    expect(() => resolveNotePath('   ', '/tmp/foo')).toThrow('note_name must not be empty');
  });

  it('отклоняет NUL-символ в имени', () => {
    expect(() => resolveNotePath('a\0b', '/tmp/foo')).toThrow('invalid characters');
  });

  it('обрезает пробелы по краям имени', () => {
    expect(resolveNotePath('  встреча  ', '/tmp/foo')).toBe(path.join('/tmp/foo', 'notes', 'встреча.md'));
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

  it('сохраняет многострочный текст после шапки заметки', async () => {
    await writeNote('много', 'первая\nвторая\n\nтретья', dir);
    const content = await readNoteContent('много', dir);
    expect(content).toMatch(
      /^Автор: \S+\nДата: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\n\nпервая\nвторая\n\nтретья$/,
    );
  });

  it('listNoteFiles создаёт папку notes, если её нет', async () => {
    expect(await listNoteFiles(dir)).toEqual([]);
  });

  it('listNoteFiles возвращает только .md файлы', async () => {
    await writeNote('первая', 'один', dir);
    await writeNote('вторая', 'два', dir);
    await writeFile(path.join(dir, 'notes', 'не_заметка.txt'), 'игнор');
    const files = await listNoteFiles(dir);
    expect(files).toEqual(expect.arrayContaining(['первая.md', 'вторая.md']));
    expect(files).not.toContain('не_заметка.txt');
  });

  it('listNoteFiles включает заметки с расширением .MD в верхнем регистре', async () => {
    await writeNote('нижний', 'x', dir);
    await writeFile(path.join(dir, 'notes', 'ВЕРХНИЙ.MD'), 'x');
    const files = await listNoteFiles(dir);
    expect(files).toEqual(expect.arrayContaining(['нижний.md', 'ВЕРХНИЙ.MD']));
  });
});
