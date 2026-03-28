module.exports = {
  apps: [
    {
      name: "photo-sharing",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/var/www/vhosts/photos/server",
      env_file: ".env.local",
      user: "photos",
      autorestart: true,
      restart_delay: 5000,
      out_file: "/var/www/vhosts/photos/log/pm2.log",
      error_file: "/var/www/vhosts/photos/log/pm2-error.log",
      merge_logs: true,
    },
  ],
};
