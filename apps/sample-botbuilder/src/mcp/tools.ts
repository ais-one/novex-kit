import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import initOpenWeatherTools from '../integration/openweather.ts';
import initRagTools from './rag-tools.ts';

export default function initTools(server: McpServer) {
  initRagTools(server);
  initOpenWeatherTools(server);
}
