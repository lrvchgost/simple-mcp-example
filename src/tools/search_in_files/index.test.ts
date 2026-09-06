import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { searchInFilesHandler } from './index.js';

const NOTE_WITH_DEMO =
  'Автор: roman\nДата: 06.09.2026 14:30\n\nстрока 1\nстрока 2\nДемо в пятницу\nстрока 4\nстрока 5';

async function writeNote(dir: string, fileName: string, content: string): Promise<string> {
  const notesDir = path.join(dir, 'notes');
  await mkdir(notesDir, { recursive: true });
  const filePath = path.join(notesDir, fileName);
  await writeFile(filePath, content);
  return filePath;
}

describe('search_in_files', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-grep-'));
  });

  it('ищет по содержимому регистронезависимо с контекстом', async () => {
    await writeNote(dir, 'встреча.md', NOTE_WITH_DEMO);

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
    await writeNote(dir, 'встреча.md', NOTE_WITH_DEMO);

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    expect(result.content[0].text).toContain('Дата: 06.09.2026 14:30\n\n');
  });

  it('не дублирует заголовок (Дата) в результатах', async () => {
    await writeNote(dir, 'встреча.md', NOTE_WITH_DEMO);

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text.match(/Дата:/g)).toHaveLength(1);
  });

  it('оборачивает каждое вхождение паттерна в строке в bold', async () => {
    await writeNote(dir, 'заметка.md', 'Автор: roman\nДата: 06.09.2026 14:30\n\nдемо и ещё демо демо');

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    expect(result.content[0].text).toContain('**демо** и ещё **демо** **демо**');
  });

  it('объединяет пересекающиеся окна контекста без дублирования строк', async () => {
    await writeNote(
      dir,
      'заметка.md',
      'Автор: roman\nДата: 06.09.2026 14:30\n\na1\nb1\nДЕМО первое\nb2\nдемо второе\nb3',
    );

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text).toContain('**ДЕМО** первое');
    expect(text).toContain('**демо** второе');
    expect(text).toContain('a1');
    expect(text).toContain('b3');
    expect(text.match(/b2/g)).toHaveLength(1);
  });

  it('возвращает блоки для нескольких файлов, разделённые пустой строкой', async () => {
    await writeNote(dir, 'встреча.md', NOTE_WITH_DEMO);
    await writeNote(dir, 'план.md', 'Автор: ann\nДата: 07.09.2026 10:00\n\nнужно демо сделать');

    const result = await searchInFilesHandler({ pattern: 'демо' }, dir);
    const text = result.content[0].text;
    expect(text.match(/Файл: /g)).toHaveLength(2);
    expect(text).toContain('Файл: встреча.md');
    expect(text).toContain('\n\nФайл: план.md');
    expect(text).toContain('**демо** сделать');
  });

  it('не ищет паттерн в шапке заметки (Автор/Дата)', async () => {
    await writeNote(dir, 'заметка.md', 'Автор: roman\nДата: 06.09.2026 14:30\n\nпривет мир');

    const result = await searchInFilesHandler({ pattern: 'roman' }, dir);
    expect(result.content[0].text).toBe('');
  });

  it('отклоняет пустой паттерн', async () => {
    await expect(searchInFilesHandler({ pattern: '' }, dir)).rejects.toThrow('pattern must not be empty');
  });

  it('отклоняет паттерн из пробелов', async () => {
    await expect(searchInFilesHandler({ pattern: '  ' }, dir)).rejects.toThrow('pattern must not be empty');
  });

  it('возвращает пустую строку, если совпадений нет', async () => {
    await writeNote(dir, 'встреча.md', 'Автор: roman\nДата: 01.01.2026 00:00\n\nничего');

    const result = await searchInFilesHandler({ pattern: 'несуществующий' }, dir);
    expect(result.content[0].text).toBe('');
  });
});
