# 0101bot - 自动化机器人集合

## 包含的机器人

### 1. daiju-bot (大桔农场)
自动化农场管理：收割、种植、出售葡萄

**功能特性：**
- ✅ 支持任意数量地块（7块、8块等）
- ✅ 每6小时自动重启浏览器，避免内存泄漏
- ✅ 自动登录、收割、种植、出售
- ✅ 增强错误处理和自动恢复

### 2. wong-checkin (WONG公益站签到)
每天自动签到领取额度

**功能特性：**
- ✅ 每天早上 8:00 自动签到
- ✅ 使用 LinuxDO OAuth 登录
- ✅ 签到成功后记录奖励金额

## 部署

### 快速部署
```bash
bash deploy.sh
```

### 手动部署
```bash
# 1. 推送到 GitHub
git push

# 2. 服务器操作
ssh root@8.130.182.148
cd /root/0101bot
git pull
npm install
pm2 restart all
```

## 配置

### daiju-bot 配置
编辑 `daiju-bot.js` 中的配置：
```javascript
const CONFIG = {
    userId: "你的ID",
    apiKey: "你的API密钥",
    checkInterval: 35000,        // 巡检间隔（毫秒）
    restartInterval: 6 * 60 * 60 * 1000  // 重启间隔（6小时）
};
```

### wong-checkin 配置
编辑 `wong-checkin.js` 中的配置：
```javascript
const CONFIG = {
    linuxdo: {
        username: "你的LinuxDO用户名",
        password: "你的LinuxDO密码"
    },
    schedule: "0 0 8 * * *"  // cron格式：每天8点
};
```

## PM2 命令

```bash
pm2 list                  # 查看所有进程
pm2 logs                  # 查看所有日志
pm2 logs daiju-bot        # 查看农场日志
pm2 logs wong-checkin     # 查看签到日志
pm2 restart all           # 重启所有
pm2 stop all              # 停止所有
```

## 手动执行签到

```bash
# 立即执行一次签到
node wong-checkin.js --now
# 或
npm run checkin
```

## 服务器信息

- 服务器: 8.130.182.148
- 项目路径: /root/0101bot
- PM2 进程: daiju-bot, wong-checkin
