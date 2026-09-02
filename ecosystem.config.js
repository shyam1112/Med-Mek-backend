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
        // Report date-range boundaries (Today's Sales, monthly reports, etc.)
        // are computed from the Node process's local timezone. Pinning this
        // explicitly avoids a silent offset if the server OS defaults to UTC
        // instead of the pharmacy's actual business timezone.
        TZ: 'Asia/Kolkata',
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
