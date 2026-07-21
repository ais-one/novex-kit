module.exports = {
  apps: [
    {
      name: 'sample-botbuilder-api',
      script: 'src/index.ts',
      env: { NODE_ENV: 'development', API_PORT: 3101 },
    },
    {
      name: 'sample-botbuilder-mcp',
      script: 'src/mcp/server.ts',
      env: { NODE_ENV: 'development', MCP_PORT: 3100 },
    },
  ],
};
