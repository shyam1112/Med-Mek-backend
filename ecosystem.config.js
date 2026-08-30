module.exports = {
  apps: [
    {
      name: 'medmek-backend',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // .env is loaded by the app itself via `dotenv/config` in src/server.ts —
      // this file only tells PM2 how to run the compiled build, not the config.
      max_memory_restart: '300M',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
    },
  ],
};
