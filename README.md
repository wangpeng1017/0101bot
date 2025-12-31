# 0101bot - 自动化机器人集合

## 包含的机器人

### 1. daiju-bot (大桔农场)
自动化农场管理：收割、种植、出售葡萄

**功能特性：**
- ✅ 支持任意数量地块（7块、8块等）
- ✅ 每6小时自动重启浏览器，避免内存泄漏
- ✅ 自动登录、收割、种植、出售
- ✅ 增强错误处理和自动恢复

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
pm2 restart daiju-bot
```

## 配置

编辑 `daiju-bot.js` 中的配置：

```javascript
const CONFIG = {
    userId: "你的ID",
    apiKey: "你的API密钥",
    checkInterval: 35000,        // 巡检间隔（毫秒）
    restartInterval: 6 * 60 * 60 * 1000  // 重启间隔（6小时）
};
```

## PM2 命令

```bash
pm2 logs daiju-bot      # 查看日志
pm2 restart daiju-bot   # 重启
pm2 stop daiju-bot      # 停止
pm2 delete daiju-bot    # 删除
```

## 服务器信息

- 服务器: 8.130.182.148
- 项目路径: /root/0101bot
- PM2 进程: daiju-bot
