const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.evaluate(() => {
      localStorage.setItem('dorm-life-endings-v1', '{}');
      localStorage.setItem('dorm-life-achievements-v1', '"broken"');
    });
    await page.reload();
    assert.deepEqual(await page.evaluate(() => window.__dormlife.endings), []);
    await page.evaluate(() => {
      const g = window.__dormlife;
      g.start('回归测试');
      g.setNextChain(CHAINS[0].id);
      g.doAction('study');
      g.chooseEvent(0);
      g.doAction('study');
      g.chooseEvent(0);
      g.doAction('study');
    });
    const poolValid = await page.evaluate(() => {
      const g = window.__dormlife;
      for (let i = 0; i < 1000; i++) {
        const e = g.debugPickEvent();
        if (e.chain || e.club || e.job || (e.year && e.year !== 1)) return false;
      }
      return true;
    });
    assert.equal(poolValid, true, '未完成连锁不应被覆盖，也不应抽到其他社团/兼职事件');
    await page.evaluate(() => {
      const g = window.__dormlife;
      for (let sem = 1; sem <= 8; sem++) {
        while (g.stepIndex < 8 && !g.state.over) {
          g.debugSetStats({health:100, money:10000});
          if ([0,2,4].includes(g.stepIndex)) g.doAction('study');
          else g.chooseEvent(0);
        }
        g.nextSemester();
        if ([2,4,6].includes(sem)) g.chooseBreak(BREAK_CHOICES[0].id);
      }
    });
    assert.equal(await page.evaluate(() => window.__dormlife.state.over), true);
    assert.equal(await page.evaluate(() => window.__dormlife.endings.length), 1);
    await page.evaluate(() => {
      const g = window.__dormlife;
      g.start('流程校验');
      g.nextSemester();
      if (g.state.semester !== 1) throw new Error('未完成学期不应提前跳过');
      g.doAction('study');
      const snapshot = JSON.stringify(g.state);
      g.doAction('work');
      g.buyItem('phone');
      g.chooseBreak(BREAK_CHOICES[0].id);
      if (JSON.stringify(g.state) !== snapshot) throw new Error('事件阶段不应接受行动、购物或假期操作');
    });
    await page.reload();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (process.env.ARTIFACT_DIR) await page.screenshot({ path: path.join(process.env.ARTIFACT_DIR, `dorm-life-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 异常存储、连锁保护、事件资格筛选、八学期毕业');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
