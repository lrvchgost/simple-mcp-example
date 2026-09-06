import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { searchInFilesHandler } from './index.js';

describe('search_in_files', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-grep-'));
  });

  it('ищет по содержимому регистронезависимо с контекстом', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(
      path.join(notesDir, 'встреча.md'),
      'Автор: roman\nДата: 06.09.2026 14:30\n\nстрока 1\nстрока 2\nДемо в пятницу\nстрока 4\nстрока 5',
    );

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text).toContain('Файл: встреча.md');
    expect(text).toContain('Автор: roman');
    expect(text).toContain('Дата: 06.09.2026 14:30');
    expect(text).toContain('**Демо** в пятницу');
    expect(text).toContain('строка 2');
    expect(text).toContain('строка 4');
  });

  it('добавляет пустую строку после даты', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(
      path.join(notesDir, 'встреча.md'),
      'Автор: roman\nДата: 06.09.2026 14:30\n\nстрока 1\nстрока 2\nДемо в пятницу\nстрока 4\nстрока 5',
    );

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text).toContain('Дата: 06.09.2026 14:30\n\n');
  });

  it('не дублирует заголовок (Дата) в результатах', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(
      path.join(notesDir, 'встреча.md'),
      'Автор: roman\nДата: 06.09.2026 14:30\n\nстрока 1\nстрока 2\nДемо в пятницу\nстрока 4\nстрока 5',
    );

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text.match(/Дата:/g)).toHaveLength(1);
  });

  it('возвращает пустую строку, если совпадений нет', async () => {
    const notesDir = path.join(dir, 'notes');
    await mkdir(notesDir, { recursive: true });
    await writeFile(path.join(notesDir, 'встреча.md'), 'Автор: roman\nДата: 01.01.2026 00:00\n\nничего');

    const result = await searchInFilesHandler({ pattern: 'несуществующий' }, dir);
    expect(result.content[0].text).toBe('');
  });
});
