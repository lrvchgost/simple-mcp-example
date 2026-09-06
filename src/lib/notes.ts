import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const NOTES_DIR_NAME = 'notes';
export const NOTE_EXTENSION = '.md';

export function getNotesDir(baseDir: string = process.cwd()): string {
  return path.join(baseDir, NOTES_DIR_NAME);
}

export async function ensureNotesDir(baseDir: string = process.cwd()): Promise<string> {
  const dir = getNotesDir(baseDir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function getAuthor(): string {
  return process.env.USER ?? process.env.USERNAME ?? 'unknown';
}

function normalizeNoteName(noteName: string): string {
  const trimmed = noteName.trim();
  if (!trimmed) {
    throw new Error('note_name must not be empty');
  }
  if (trimmed.includes('\0')) {
    throw new Error('note_name contains invalid characters');
  }
  if (path.isAbsolute(trimmed)) {
    throw new Error('absolute paths are not allowed');
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('note_name must not contain path separators');
  }
  const withExt = trimmed.toLowerCase().endsWith(NOTE_EXTENSION)
    ? trimmed
    : `${trimmed}${NOTE_EXTENSION}`;
  if (!withExt.toLowerCase().endsWith(NOTE_EXTENSION)) {
    throw new Error(`only ${NOTE_EXTENSION} files are allowed`);
  }
  return withExt;
}

export function resolveNotePath(noteName: string, baseDir: string = process.cwd()): string {
  const normalized = normalizeNoteName(noteName);
  const notesDir = getNotesDir(baseDir);
  const full = path.resolve(notesDir, normalized);
  const relative = path.relative(notesDir, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path traversal is not allowed');
  }
  return full;
}

export function buildNoteContent(author: string, date: Date, text: string): string {
  return `Автор: ${author}\nДата: ${formatDate(date)}\n\n${text}`;
}

export async function writeNote(
  noteName: string,
  text: string,
  baseDir: string = process.cwd(),
): Promise<{ path: string; fileName: string }> {
  await ensureNotesDir(baseDir);
  const filePath = resolveNotePath(noteName, baseDir);
  const content = buildNoteContent(getAuthor(), new Date(), text);
  await writeFile(filePath, content, 'utf8');
  return { path: filePath, fileName: path.basename(filePath) };
}

export async function listNoteFiles(baseDir: string = process.cwd()): Promise<string[]> {
  const notesDir = getNotesDir(baseDir);
  const entries = await readdir(notesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(NOTE_EXTENSION))
    .map((entry) => entry.name);
}

export async function getNoteFileWithMtime(
  fileName: string,
  baseDir: string = process.cwd(),
): Promise<{ fileName: string; mtime: number }> {
  const notesDir = getNotesDir(baseDir);
  const full = path.resolve(notesDir, fileName);
  const relative = path.relative(notesDir, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path traversal is not allowed');
  }
  const info = await stat(full);
  return { fileName, mtime: info.mtimeMs };
}

export async function readNoteContent(noteName: string, baseDir: string = process.cwd()): Promise<string> {
  const filePath = resolveNotePath(noteName, baseDir);
  return readFile(filePath, 'utf8');
}
