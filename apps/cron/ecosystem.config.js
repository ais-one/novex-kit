export default {
  apps: [
    {
      name: 'cron',
      script: './index.js',
      output: './logs/cron-out.log',
      error: './logs/cron-error.log',
      log_type: 'json',
      env_production: { NODE_ENV: 'production' },
    },
  ],
};
