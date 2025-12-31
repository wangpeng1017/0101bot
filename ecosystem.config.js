module.exports = {
  apps: [
    {
      name: 'daiju-bot',
      script: 'daiju-bot.js',
      cwd: '/root/0101bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      // 错误重启配置
      exp_backoff_restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/root/.pm2/logs/daiju-bot-error.log',
      out_file: '/root/.pm2/logs/daiju-bot-out.log',
      merge_logs: true
    }
  ]
};
