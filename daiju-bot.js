/**
 * @file daiju-bot.js
 * @desc 大桔农场自动化机器人 - 支持自动收割、种植、出售葡萄
 * @version 2.0.0
 * @features
 *   - 支持任意数量地块（7块、8块等）
 *   - 每6小时自动重启浏览器，避免内存泄漏
 *   - 增强错误处理和自动恢复
 */

const { chromium } = require('playwright');

// ============ 配置区域 ============
const CONFIG = {
    // 账号信息（改成自己的）
    userId: "1264",
    apiKey: "DCFRs+hx2QlnMn2zjLFRlX5LthA4d8Ty",

    // 路由
    routes: {
        FARM: 'https://game.daiju.live/farm',
        LOGIN: 'https://game.daiju.live/login',
        MARKET: 'https://game.daiju.live/market'
    },

    // 时间配置
    checkInterval: 35000,           // 巡检间隔：35秒
    restartInterval: 6 * 60 * 60 * 1000,  // 浏览器重启间隔：6小时

    // 浏览器配置
    browserDataDir: '/tmp/daiju_bot_data',
    headless: true
};

// ============ 全局变量 ============
let context = null;
let page = null;
let needToSell = false;
let startTime = Date.now();
let checkCount = 0;

// ============ 日志函数 ============
function log(tag, message) {
    const time = new Date().toLocaleString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    console.log(`[${time}] [${tag}] ${message}`);
}

// ============ 浏览器管理 ============
async function initBrowser() {
    log('系统', '正在启动浏览器...');

    context = await chromium.launchPersistentContext(CONFIG.browserDataDir, {
        headless: CONFIG.headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });

    page = context.pages()[0] || await context.newPage();
    startTime = Date.now();
    checkCount = 0;

    log('系统', '浏览器启动成功');
}

async function restartBrowser() {
    log('系统', '===== 定时重启浏览器 =====');

    try {
        if (context) {
            await context.close();
        }
    } catch (err) {
        log('警告', `关闭旧浏览器失败: ${err.message}`);
    }

    // 等待一会儿再重启
    await new Promise(r => setTimeout(r, 3000));

    await initBrowser();
    await page.goto(CONFIG.routes.FARM);

    log('系统', '浏览器重启完成，继续工作');
}

// ============ 路由管理 ============
async function ensureRoute(targetUrl) {
    try {
        const isLoginVisible = await page.locator('#userId').count() > 0;

        if (isLoginVisible || page.url().includes('/login')) {
            log('登录', '检测到登录页，正在登录...');
            await page.fill('#userId', CONFIG.userId);
            await page.fill('#apiKey', CONFIG.apiKey);
            await page.click('button:has-text("开始游戏")');
            await page.waitForTimeout(5000);
            await page.goto(targetUrl);
            log('登录', '登录成功');
        } else if (!page.url().includes(targetUrl)) {
            await page.goto(targetUrl);
            await page.waitForLoadState('networkidle');
        }
    } catch (err) {
        log('路由', `导航失败: ${err.message}`);
        throw err;
    }
}

// ============ 出售功能 ============
async function sellCrops() {
    try {
        await ensureRoute(CONFIG.routes.MARKET);
        log('市场', '正在检查葡萄库存...');

        const grapeCard = page.locator('.game-module__x94Hka__itemCard')
            .filter({ hasText: '葡萄' }).first();

        if (await grapeCard.count() > 0) {
            const infoText = await grapeCard.innerText();
            const match = infoText.match(/拥有:\s*(\d+)/);
            const count = match ? parseInt(match[1]) : 0;

            if (count > 0) {
                log('市场', `发现葡萄 x${count}，执行出售...`);

                const input = grapeCard.locator('input[type="number"]');
                if (await input.count() > 0) {
                    await input.fill(count.toString());
                }

                await grapeCard.locator('button:has-text("出售")').click({ force: true });
                await page.waitForTimeout(2000);
                log('市场', `出售成功！售出 ${count} 个葡萄`);
            } else {
                log('市场', '无库存可卖');
            }
        } else {
            log('市场', '未找到葡萄卡片');
        }
    } catch (err) {
        log('市场异常', err.message);
    } finally {
        needToSell = false;
        await page.goto(CONFIG.routes.FARM);
    }
}

// ============ 农场主逻辑 ============
async function doFarmJob() {
    checkCount++;

    // 检查是否需要重启浏览器（每6小时）
    const runningTime = Date.now() - startTime;
    if (runningTime >= CONFIG.restartInterval) {
        await restartBrowser();
        return;
    }

    try {
        // 需要出售时先去市场
        if (needToSell) {
            await sellCrops();
            return;
        }

        await ensureRoute(CONFIG.routes.FARM);

        const runningHours = (runningTime / (1000 * 60 * 60)).toFixed(1);
        log('巡检', `===== 第 ${checkCount} 次巡检 (运行 ${runningHours}h) =====`);

        // 1. 收割成熟作物
        const harvestBtns = page.locator('.farm-module__IQ8sKW__harvestButton');
        const harvestCount = await harvestBtns.count();

        if (harvestCount > 0) {
            log('收割', `发现 ${harvestCount} 块地待收获`);

            for (let i = 0; i < harvestCount; i++) {
                try {
                    await harvestBtns.first().click({ force: true });
                    await page.waitForTimeout(1500);
                    log('收割', `  ✓ 第 ${i + 1}/${harvestCount} 块收割完成`);
                } catch (err) {
                    log('收割', `  ✗ 第 ${i + 1} 块收割失败: ${err.message}`);
                }
            }

            needToSell = true;
            log('收割', '收割完成，下次巡检将出售');
            return;
        }

        // 2. 种植空地
        const emptyPlots = page.locator('.farm-module__IQ8sKW__farmPlot')
            .filter({ hasText: '空田地' });
        const plotCount = await emptyPlots.count();

        if (plotCount > 0) {
            log('种植', `检测到 ${plotCount} 块空田地`);

            const grapeSeed = page.locator('.farm-module__IQ8sKW__seedItem')
                .filter({ hasText: '葡萄' }).first();

            if (await grapeSeed.count() > 0) {
                for (let i = 0; i < plotCount; i++) {
                    try {
                        // 选中种子
                        await grapeSeed.click({ force: true });
                        await page.waitForTimeout(800);

                        // 点击空地种植
                        const currentPlot = page.locator('.farm-module__IQ8sKW__farmPlot')
                            .filter({ hasText: '空田地' }).first();

                        if (await currentPlot.count() === 0) {
                            log('种植', `  已无空地，停止种植`);
                            break;
                        }

                        await currentPlot.click({ force: true });
                        await page.waitForTimeout(3000);

                        log('种植', `  ✓ 第 ${i + 1}/${plotCount} 块种植完成`);
                    } catch (err) {
                        log('种植', `  ✗ 第 ${i + 1} 块种植失败: ${err.message}`);
                    }
                }
            } else {
                log('种植', '种子不足，请购买葡萄种子');
            }
        } else {
            // 检查正在生长的作物数量
            const growingPlots = page.locator('.farm-module__IQ8sKW__farmPlot')
                .filter({ hasText: /葡萄|生长/ });
            const growingCount = await growingPlots.count().catch(() => 0);

            log('状态', `无空地，${growingCount} 块地正在生长中`);
        }

    } catch (err) {
        log('异常', err.message);

        // 严重错误时尝试重启浏览器
        if (err.message.includes('Target crashed') ||
            err.message.includes('Target closed') ||
            err.message.includes('Session closed')) {
            log('恢复', '检测到浏览器崩溃，尝试重启...');
            await restartBrowser();
        }
    }
}

// ============ 主程序 ============
(async () => {
    log('系统', '========================================');
    log('系统', '  大桔农场机器人 v2.0');
    log('系统', '  - 支持任意数量地块');
    log('系统', '  - 每6小时自动重启浏览器');
    log('系统', '========================================');

    await initBrowser();
    await page.goto(CONFIG.routes.FARM);

    // 启动定时巡检
    setInterval(doFarmJob, CONFIG.checkInterval);

    // 立即执行一次
    await doFarmJob();
})();
