import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addNoteHandler } from './index.js';

describe('add_note', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'notes-add-'));
  });

  it('создаёт заметку с расширением .md', async () => {
    const result = await addNoteHandler({ note_name: 'встреча', text: 'Привет мир' }, dir);
    const content = await readFile(path.join(dir, 'notes', 'встреча.md'), 'utf8');
    expect(result.content[0].text).toContain('встреча.md');
    expect(content).toMatch(/^Автор: \S+\nДата: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\n\nПривет мир$/);
  });

  it('не добавляет второе расширение, если уже передано .md', async () => {
    await addNoteHandler({ note_name: 'идеи.md', text: 'Текст' }, dir);
    await expect(readFile(path.join(dir, 'notes', 'идеи.md'), 'utf8')).resolves.toContain('Текст');
  });

  it('нормализует расширение .MD к нижнему регистру .md', async () => {
    const result = await addNoteHandler({ note_name: 'Заметка.MD', text: 'Текст' }, dir);
    expect(result.content[0].text).toContain('Заметка.md');
    await expect(readFile(path.join(dir, 'notes', 'Заметка.md'), 'utf8')).resolves.toContain('Текст');
  });

  it('перезаписывает существующую заметку', async () => {
    await addNoteHandler({ note_name: 'заметка', text: 'первая версия' }, dir);
    await addNoteHandler({ note_name: 'заметка', text: 'вторая версия' }, dir);
    const content = await readFile(path.join(dir, 'notes', 'заметка.md'), 'utf8');
    expect(content).toContain('вторая версия');
    expect(content).not.toContain('первая версия');
  });

  it('отклоняет path traversal через ../', async () => {
    await expect(addNoteHandler({ note_name: '../зло', text: 'x' }, dir)).rejects.toThrow('path separators');
  });

  it('отклоняет backslash traversal', async () => {
    await expect(addNoteHandler({ note_name: '..\\зло', text: 'x' }, dir)).rejects.toThrow('path separators');
  });

  it('отклоняет вложенные разделители пути', async () => {
    await expect(addNoteHandler({ note_name: 'папка/заметка', text: 'x' }, dir)).rejects.toThrow('path separators');
  });

  it('отклоняет абсолютные пути', async () => {
    await expect(addNoteHandler({ note_name: '/etc/passwd', text: 'x' }, dir)).rejects.toThrow();
  });

  it('отклоняет пустое имя заметки', async () => {
    await expect(addNoteHandler({ note_name: '', text: 'x' }, dir)).rejects.toThrow('note_name must not be empty');
  });

  it('отклоняет имя из одних пробелов', async () => {
    await expect(addNoteHandler({ note_name: '   ', text: 'x' }, dir)).rejects.toThrow('note_name must not be empty');
  });

  it('сохраняет многострочный текст в теле заметки', async () => {
    await addNoteHandler({ note_name: 'много', text: 'строка1\nстрока2' }, dir);
    const content = await readFile(path.join(dir, 'notes', 'много.md'), 'utf8');
    expect(content).toMatch(/^Автор: \S+\nДата: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}\n\nстрока1\nстрока2$/);
  });
});
