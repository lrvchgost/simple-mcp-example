# simple-mcp-example

MCP-сервер для работы с заметками. Позволяет создавать, просматривать и искать заметки, которые хранятся в локальных `.md`-файлах. Построен на [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) и работает через транспорт `stdio`.

## Описание сервера

Сервер управляет заметками, сохранёнными в виде Markdown-файлов в папке `notes`. Папка создаётся автоматически в текущем каталоге запуска (cwd). Каждая заметка — это отдельный `.md`-файл.

Структура заметки (каждая строка отдельно):

```md
Автор: <$USER>
Дата: dd.mm.yyyy HH:mm

<текст заметки>
```

- **Автор** — берётся из переменной окружения `$USER`.
- **Дата** — дата и время создания.
- **Текст** — произвольное содержимое заметки.

Все пути к файлам защищены от path traversal (`../`, абсолютные пути).

## Структура кода

Сервер поднимается и инструменты регистрируются в файле `src/index.ts:10–28`:
- создание экземпляра `McpServer` и инициализация логгера;
- регистрация всех тулов (`add_note`, `get_all_notes`, `view_note_content`, `search_notes`, `search_in_files`);
- запуск транспорта `stdio` в функции `main()`.

Реализация каждого тула лежит в отдельной папке `src/tools/<name>/index.ts`.

### Логирование (debug)

Логи во все тулы добавляются через логгер из `src/lib/logger.ts:17–25` (`createMcpLogger`, вызывает `server.sendLoggingMessage`). В логах MCP-клиента записи отображаются как `message="MCP server log"`.

#### `add_note`
- Файл и реализация: `src/tools/add_note/index.ts` (обработчик `addNoteHandler` — строки 13–19; регистрация — 21–39).
- Логирование: строки 29 (`add_note: start`), 32 (`add_note: success`), 35 (`add_note: error`).
- Пример вывода:
  ```
  ... level=INFO ... message="MCP server log" ... data.message="add_note: start" data.note_name=встреча
  ```

#### `get_all_notes`
- Файл и реализация: `src/tools/get_all_notes/index.ts` (обработчик `getAllNotesHandler` — строки 5–12; регистрация — 14–32).
- Логирование: строки 22 (`get_all_notes: start`), 25 (`get_all_notes: success`), 28 (`get_all_notes: error`).
- Пример вывода:
  ```
  ... level=INFO ... message="MCP server log" ... data.message="get_all_notes: start"
  ```

#### `view_note_content`
- Файл и реализация: `src/tools/view_note_content/index.ts` (обработчик `viewNoteContentHandler` — строки 12–18; регистрация — 20–38).
- Логирование: строки 28 (`view_note_content: start`), 31 (`view_note_content: success`), 34 (`view_note_content: error`).
- Пример вывода:
  ```
  ... level=INFO ... message="MCP server log" ... data.message="view_note_content: start" data.note_name=встреча
  ```

#### `search_notes`
- Файл и реализация: `src/tools/search_notes/index.ts` (обработчик `searchNotesHandler` — строки 12–20; регистрация — 22–40).
- Логирование: строки 30 (`search_notes: start`), 33 (`search_notes: success`), 36 (`search_notes: error`).
- Пример вывода:
  ```
  ... level=INFO ... message="MCP server log" ... data.message="search_notes: start" data.pattern=встре
  ```

#### `search_in_files`
- Файл и реализация: `src/tools/search_in_files/index.ts` (обработчик `searchInFilesHandler` — строки 63–86; регистрация — 88–107).
- Логирование: строки 97 (`search_in_files: start`), 100 (`search_in_files: success`), 103 (`search_in_files: error`).
- Пример вывода:
  ```
  timestamp=2026-09-06T12:56:31.417Z level=INFO run=a5cd661a message="MCP server log" server=my-simple-notes level=info data.message="search_in_files: start" data.pattern=хлеб
  ```

## Контракт результата

Формат вывода каждого тула зафиксирован в этом же `README.md` в разделе «## Тулы», в блоке «Пример результата»:

- Формат файла заметки (структура `.md`) — раздел «## Описание сервера» → «Структура заметки» (`README.md:9–16`).
- Формат вывода `view_note_content` — раздел «## Тулы» → «### view_note_content» → «Пример результата» (`README.md:128–134`).
- Формат вывода `search_in_files` — раздел «## Тулы» → «### search_in_files» → «Пример результата» (`README.md:164–171`).

Строгие требования к формату (без сокращений и перефразирования) дополнительно зафиксированы в `AGENTS.md`.

## Тулы
Тулами являются вспомогательные функции для управления заметками

### `add_note`
Создаёт новую заметку (или перезаписывает существующую).

Параметры:
- `note_name` (строка, required) — имя файла заметки; расширение `.md` добавляется автоматически.
- `text` (строка, required) — текст заметки. Можно передать явно или попросить модель сделать саммари/выжимку.

Пример вызова:
```json
{
  "name": "add_note",
  "arguments": {
    "note_name": "встреча",
    "text": "Обсудили план на неделю и договорились о демо в пятницу."
  }
}
```
Результат: создаётся файл `notes/встреча.md`.

### `get_all_notes`
Возвращает список имён всех заметок, отсортированных по дате (mtime файла) от старых к новым.

Параметры: нет.

Пример вызова:
```json
{ "name": "get_all_notes" }
```
Пример результата:
```
встреча.md
идеи.md
рецепт.md
```

### `view_note_content`
Возвращает полный текст заметки.

Параметры:
- `note_name` (строка, required) — имя заметки.

Пример вызова:
```json
{
  "name": "view_note_content",
  "arguments": { "note_name": "встреча" }
}
```
Пример результата:
```
Автор: roman
Дата: 06.09.2026 14:30

Обсудили план на неделю и договорились о демо в пятницу.
```

### `search_notes`
Ищет заметки по имени файла. Поиск регистронезависимый.

Параметры:
- `pattern` (строка, required) — паттерн для поиска в названиях файлов.

Пример вызова:
```json
{
  "name": "search_notes",
  "arguments": { "pattern": "встре" }
}
```
Пример результата: `встреча.md`

### `search_in_files`
Ищет паттерн в содержимом файлов. Поиск регистронезависимый. Для каждого совпадения выводит автора, дату и найденную строку с контекстом ±2 строки.

Параметры:
- `pattern` (строка, required) — паттерн для поиска в содержимом файлов.

Пример вызова:
```json
{
  "name": "search_in_files",
  "arguments": { "pattern": "демо" }
}
```
Пример результата:
```
Файл: встреча.md
Автор: roman
Дата: 06.09.2026 14:30

Обсудили план на неделю и договорились о **демо** в пятницу.
```

## Установка

Требования: Node.js (последняя стабильная версия).

```bash
npm install
npm run build
```

После сборки готовый к запуску файл — `build/index.js`.

## Подключение к MCP-клиенту

Сервер работает через `stdio`. Пример конфигурации для MCP-клиента (например, Claude Desktop):
MCP сервер подключается через скачивание пакета и указания команды и пути до файла index.js

```json
{
  "mcpServers": {
    "my-simple-notes": {
      "command": "node",
      "args": ["/absolute/path/to/simple-mcp-example/build/index.js"]
    }
  }
}
```

### Пошаговое подключение в opencode

1. Соберите сервер:
   ```bash
   npm install
   npm run build
   ```
   После сборки готовый к запуску файл — `build/index.js`.

2. Создайте (или откройте) файл конфигурации opencode — `opencode.json` в корне проекта (либо глобально в `~/.config/opencode/opencode.json`).

3. Добавьте сервер в секцию `mcp`:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "mcp": {
       "my-simple-notes": {
         "type": "local",
         "command": ["node", "./path-to-your-package-instalation/build/index.js"],
         "cwd": ".",
         "enabled": true
       }
     }
   }
   ```
   Параметры:
   - `type` — `"local"`, сервер запускается локально через `stdio`.
   - `command` — команда и аргументы запуска (`node build/index.js`).
   - `cwd` — рабочая папка сервера; относительно неё создаётся папка `notes` с заметками.
   - `enabled` — `true`, чтобы сервер был включён при старте.

4. Перезапустите opencode. Инструменты сервера станут доступны с префиксом имени сервера: `my-simple-notes_add_note`, `my-simple-notes_get_all_notes`, `my-simple-notes_view_note_content`, `my-simple-notes_search_notes`, `my-simple-notes_search_in_files`.

5. Проверьте подключение — например, попросите в чате: «выведи список всех заметок».

Сервер можно отключить, не удаляя из конфигурации, поставив `"enabled": false`.

## Запуск для разработки
```bash
npm install        # установка зависимостей
npm run build      # сборка
npx tsc --noEmit   # проверка типов
npm run lint       # линтер (ESLint)
npm test           # тесты (jest)
```

Для ручного запуска сервера через stdio:

```bash
node build/index.js
```
