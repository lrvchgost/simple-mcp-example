- в логах видно успешное обращение в тулзу
timestamp=2026-09-06T12:56:31.417Z level=INFO run=a5cd661a message="MCP server log" server=my-simple-notes logger=undefined level=info data.message="search_in_files: start" data.pattern=хлеб
timestamp=2026-09-06T12:56:31.419Z level=INFO run=a5cd661a message="MCP server log" server=my-simple-notes logger=undefined level=info data.message="search_in_files: success" data.pattern=хлеб
- на скриншотах результаты обращения у тулзам
    - успешное создание заметки
		- ожидаетвы вызов тула add_note
		- фактический вызов тула add_note
    - поиск по названию
		- ожидаетвы вызов тула search_notes
		- фактический вызов тула search_notes
    - поиск по содержимому
		- ожидаетвы вызов тула search_in_files
		- фактический вызов тула search_in_files

