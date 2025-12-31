/**
 * @file wong-checkin.js
 * @desc WONG公益站自动签到机器人
 * @version 1.0.0
 * @features
 *   - 每天早上8点自动签到
 *   - 使用 LinuxDO OAuth 登录
 *   - 签到成功后记录奖励金额
 */

const { chromium } = require('playwright');
const cron = require('node-cron');

// ============ 配置区域 ============
const CONFIG = {
    // LinuxDO 账号
    linuxdo: {
        username: "user2076",
        password: "xx198910170014Z"
    },

    // WONG 公益站
    wong: {
        baseUrl: "https://wzw.pp.ua",
        loginUrl: "https://wzw.pp.ua/login",
        topupUrl: "https://wzw.pp.ua/console/topup"
    },

    // 定时配置 (cron 格式: 秒 分 时 日 月 周)
    schedule: "0 0 8 * * *",  // 每天早上 8:00

    // 浏览器配置
    browserDataDir: '/tmp/wong_checkin_data',
    headless: true
};

// ============ 日志函数 ============
function log(tag, message) {
    const time = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    console.log(`[${time}] [${tag}] ${message}`);
}

// ============ 签到主函数 ============
async function doCheckin() {
    log('签到', '========== 开始签到任务 ==========');

    let context = null;
    let page = null;

    try {
        // 启动浏览器
        log('系统', '正在启动浏览器...');
        context = await chromium.launchPersistentContext(CONFIG.browserDataDir, {
            headless: CONFIG.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        page = context.pages()[0] || await context.newPage();
        log('系统', '浏览器启动成功');

        // 访问签到页面
        log('导航', '访问 WONG 公益站...');
        await page.goto(CONFIG.wong.topupUrl);
        await page.waitForTimeout(3000);

        // 检查是否需要登录
        if (page.url().includes('/login')) {
            log('登录', '需要登录，开始 LinuxDO OAuth 流程...');

            // 勾选同意协议
            const checkbox = page.locator('input[type="checkbox"]');
            if (await checkbox.count() > 0) {
                await checkbox.click({ force: true }).catch(() => {
                    return page.evaluate(() => {
                        const cb = document.querySelector('input[type="checkbox"]');
                        if (cb) cb.click();
                    });
                });
                await page.waitForTimeout(500);
            }

            // 点击 LinuxDO 登录
            await page.click('button:has-text("使用 LinuxDO 继续")');
            await page.waitForTimeout(3000);

            // 切换到 LinuxDO 登录页面（可能在新标签页）
            const pages = context.pages();
            const linuxdoPage = pages.find(p => p.url().includes('linux.do')) || page;

            if (linuxdoPage.url().includes('linux.do/login')) {
                log('登录', '填写 LinuxDO 账号...');
                await linuxdoPage.fill('input[name="login"], input[placeholder*="用户名"], input[placeholder*="邮件"]', CONFIG.linuxdo.username);
                await linuxdoPage.fill('input[type="password"]', CONFIG.linuxdo.password);
                await linuxdoPage.click('button:has-text("登录")');
                await linuxdoPage.waitForTimeout(3000);
            }

            // 检查 OAuth 授权页面
            if (linuxdoPage.url().includes('connect.linux.do')) {
                log('登录', '确认 OAuth 授权...');
                await linuxdoPage.click('a:has-text("允许")');
                await linuxdoPage.waitForTimeout(3000);
            }

            // 等待跳转回 WONG
            await page.waitForTimeout(5000);

            // 确保在正确页面
            if (!page.url().includes('/console/topup')) {
                await page.goto(CONFIG.wong.topupUrl);
                await page.waitForTimeout(3000);
            }

            log('登录', '登录成功');
        }

        // 查找并点击签到按钮
        log('签到', '查找签到按钮...');
        const checkinBtn = page.locator('button:has-text("签到")').first();

        if (await checkinBtn.count() > 0) {
            // 检查是否已签到
            const btnText = await checkinBtn.innerText();
            if (btnText.includes('已签到')) {
                log('签到', '今日已签到，无需重复签到');
                return { success: true, message: '今日已签到' };
            }

            // 点击签到
            await checkinBtn.click();
            await page.waitForTimeout(2000);

            // 检查签到结果
            const dialog = page.locator('div[role="dialog"], .semi-modal');
            if (await dialog.count() > 0) {
                const dialogText = await dialog.innerText();

                if (dialogText.includes('签到成功')) {
                    // 提取奖励金额
                    const rewardMatch = dialogText.match(/\$[\d.]+/);
                    const reward = rewardMatch ? rewardMatch[0] : '未知';
                    log('签到', `签到成功！获得奖励: ${reward}`);

                    // 点击确定关闭对话框
                    const confirmBtn = page.locator('button:has-text("确定")');
                    if (await confirmBtn.count() > 0) {
                        await confirmBtn.click();
                    }

                    return { success: true, message: `签到成功，获得 ${reward}` };
                } else {
                    log('签到', `签到结果: ${dialogText.substring(0, 100)}`);
                    return { success: false, message: dialogText };
                }
            }
        } else {
            log('签到', '未找到签到按钮');
            return { success: false, message: '未找到签到按钮' };
        }

    } catch (err) {
        log('错误', err.message);
        return { success: false, message: err.message };
    } finally {
        // 关闭浏览器
        if (context) {
            await context.close().catch(() => {});
        }
        log('签到', '========== 签到任务结束 ==========\n');
    }
}

// ============ 主程序 ============
(async () => {
    log('系统', '========================================');
    log('系统', '  WONG 公益站自动签到 v1.0');
    log('系统', `  定时: 每天 08:00`);
    log('系统', '========================================');

    // 启动时立即执行一次
    const args = process.argv.slice(2);
    if (args.includes('--now') || args.includes('-n')) {
        log('系统', '立即执行签到...');
        await doCheckin();
    }

    // 设置定时任务
    cron.schedule(CONFIG.schedule, async () => {
        log('定时', '触发定时签到任务');
        await doCheckin();
    }, {
        timezone: "Asia/Shanghai"
    });

    log('系统', '定时任务已启动，等待执行...');
    log('系统', '提示: 使用 --now 参数可立即执行签到');
})();
