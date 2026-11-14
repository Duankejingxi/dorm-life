// 端到端：在模拟 iPhone 上用真实点击打完一整局，检查无报错；SHOTS=目录 时顺便截图
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "dl-e2e-"));
  const { createServer } = require("../server/server.js");
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const shots = process.env.SHOTS;
  const browser = await chromium.launch();
  const ctx = await browser.newContext(Object.assign({}, devices["iPhone 13"], { deviceScaleFactor: shots ? 2 : 1 }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  let n = 0;
  const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, String(n++).padStart(2, "0") + "-" + name + ".png") }); };

  try {
    await page.goto(base + "?nosw");
    await page.evaluate(() => localStorage.setItem("dl2.settings", JSON.stringify({ speed: "instant", sound: false })));
    await page.reload();
    await page.waitForTimeout(1600);
    await shot("title");
    await page.click("#btnNew");
    await page.waitForTimeout(600);
    await page.fill("#inName", "阿念");
    await shot("setup");
    await page.click("#setupForm button[type=submit]");

    const want = new Set(["chapter", "say", "choice", "plan", "transcript", "memory", "yearbook"]);
    const shotTaken = new Set();
    let steps = 0;
    while (steps++ < 3000) {
      const st = await page.evaluate(() => {
        const vis = (id) => !document.getElementById(id).classList.contains("hidden");
        const ov = document.getElementById("overlay");
        if (vis("yearbook")) return "yearbook";
        if (vis("overlay") && ov.classList.contains("out")) return "wait";
        if (vis("overlay")) {
          if (ov.querySelector(".focus-card")) return "plan";
          if (ov.querySelector(".chapter")) return "chapter";
          if (ov.querySelector(".transcript")) return "transcript";
          if (ov.querySelector(".polaroid")) return "memory";
          return "overlay";
        }
        if (document.querySelector("#choices.on .choice")) return "choice";
        if (document.querySelector("#dialog.ready")) return "say";
        return "wait";
      });
      if (st === "yearbook") break;
      if (want.has(st) && !shotTaken.has(st)) { await page.waitForTimeout(st === "chapter" ? 2400 : st === "memory" ? 2600 : 700); await shot(st); shotTaken.add(st); }
      if (st === "plan") {
        await page.waitForTimeout(500);
        for (let k = 0; k < 10; k++) {
          const filled = await page.$$eval(".slot.filled", (x) => x.length);
          if (filled >= 3) break;
          const cards = await page.$$(".focus-card:not(.n2):not(.dim)");
          if (!cards.length) throw new Error("安排界面异常：" + (await page.$eval("#overlay", (o) => o.className + " | " + o.innerText.slice(0, 300))));
          await cards[(steps + k * 2) % cards.length].click();
        }
        await page.click(".sheet-foot .btn");
      } else if (st === "choice") {
        const cs = await page.$$("#choices .choice");
        await cs[steps % cs.length].click();
      } else if (st === "overlay" || st === "chapter" || st === "transcript" || st === "memory") {
        await page.waitForTimeout(st === "chapter" ? 1500 : 950);
        await page.mouse.click(195, 400);
      } else if (st === "say") {
        await page.mouse.click(195, 300);
      }
      await page.waitForTimeout(st === "wait" ? 120 : 40);
    }
    assert.ok(steps < 3000, "没能在 3000 步内打完");
    await page.waitForTimeout(1500);
    await shot("yearbook");
    await page.evaluate(() => { const y = document.getElementById("yearbook"); y.scrollTop = y.scrollHeight; });
    await page.waitForTimeout(1500);
    await shot("yearbook-end");
    const res = await page.evaluate(() => fetch("api/stats").then((r) => r.json()));
    assert.equal(res.runs, 1, "后端应记录一局");
    assert.deepEqual(errors, [], "页面报错：\n" + errors.join("\n"));
    console.log("e2e 通过：", steps, "步打完一局");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
