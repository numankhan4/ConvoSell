module.exports = {
  apps: [
    {
      name: 'whatsapp-crm-backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'whatsapp-crm-worker',
      script: 'dist/main.js',
      cwd: './worker',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
