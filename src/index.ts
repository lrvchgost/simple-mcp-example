import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAddNote } from './tools/add_note/index.js';
import { registerGetAllNotes } from './tools/get_all_notes/index.js';
import { registerViewNoteContent } from './tools/view_note_content/index.js';
import { registerSearchNotes } from './tools/search_notes/index.js';
import { registerSearchInFiles } from './tools/search_in_files/index.js';
import { createMcpLogger } from './lib/logger.js';

const server = new McpServer(
  {
    name: 'simple-mcp-example',
    version: '1.0.0',
  },
  { capabilities: { logging: {} } },
);

const logger = createMcpLogger(server);

registerAddNote(server, logger);
registerGetAllNotes(server, logger);
registerViewNoteContent(server, logger);
registerSearchNotes(server, logger);
registerSearchInFiles(server, logger);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
