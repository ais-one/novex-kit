module.exports = {
  apps: [
    {
      name: 'mcp-server',
      exec_mode: 'fork_mode',
      instances: '1',
      script: './src/mcp/server.ts',
      env: { NODE_ENV: 'dev' },
    },
    {
      name: 'a2a-supervisor',
      exec_mode: 'fork_mode',
      instances: '1',
      script: './src/a2a/supervisor.ts',
      env: { NODE_ENV: 'dev' },
    },
    {
      name: 'a2a-specialist',
      exec_mode: 'fork_mode',
      instances: '1',
      script: './src/a2a/specialist.ts',
      env: { NODE_ENV: 'dev' },
    },
  ],
};
