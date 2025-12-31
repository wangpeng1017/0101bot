#!/bin/bash
# 部署脚本 - 将 bot 部署到阿里云服务器
# 使用方法: bash deploy.sh

set -e

SERVER="root@8.130.182.148"
REMOTE_DIR="/root/0101bot"

echo "=========================================="
echo "  0101bot 部署脚本"
echo "=========================================="

# 1. 推送代码到 GitHub
echo ""
echo "[1/4] 推送代码到 GitHub..."
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "无新提交"
git push origin main || git push origin master

# 2. 服务器拉取代码
echo ""
echo "[2/4] 服务器拉取最新代码..."
ssh $SERVER "
    if [ ! -d $REMOTE_DIR ]; then
        git clone https://github.com/wangpeng1017/0101bot.git $REMOTE_DIR
    else
        cd $REMOTE_DIR && git pull
    fi
"

# 3. 安装依赖
echo ""
echo "[3/4] 安装依赖..."
ssh $SERVER "cd $REMOTE_DIR && npm install"

# 4. 重启服务
echo ""
echo "[4/4] 重启 PM2 服务..."
ssh $SERVER "
    cd $REMOTE_DIR
    pm2 delete daiju-bot 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    sleep 3
    pm2 logs daiju-bot --lines 10 --nostream
"

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
