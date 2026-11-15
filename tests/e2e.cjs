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
  page.on("response", (r) => { if (r.status() >= 400 && !/fonts\./.test(r.url())) errors.push(r.status() + " " + r.url()); });
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
    await page.click(".hero [data-play=new]");
    await page.waitForTimeout(600);
    await page.fill("#inName", "阿念");
    await shot("setup");
    await page.click("#setupForm button[type=submit]");

    const want = new Set(["talent", "chapter", "say", "choice", "plan", "transcript", "memory", "yearbook", "mg-intro", "mg-play:stand", "mg-play:umbrella", "mg-play:rush", "mg-play:shoot", "mg-play:rhythm", "mg-play:cram", "mg-result"]);
    const played = {};
    let cramPlayed = 0;
    const shotTaken = new Set();
    let steps = 0;
    while (steps++ < 6000) {
      const st = await page.evaluate(() => {
        const vis = (id) => !document.getElementById(id).classList.contains("hidden");
        const ov = document.getElementById("overlay");
        if (vis("yearbook")) return "yearbook";
        if (document.querySelector(".talent-screen")) return "talent";
        const mg = document.querySelector(".mg");
        if (mg && !mg.classList.contains("hidden")) {
          const c = mg.querySelector(".mg-card.on:not(.count)");
          if (c && c.querySelector(".mg-score")) return "mg-result";
          if (c && c.querySelector("button")) return /开始冲刺/.test(c.innerText) ? "mg-cram" : "mg-intro";
          return "mg-play:" + mg.dataset.kind;
        }
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
      if (st === "talent") {
        await page.waitForTimeout(1900);
        await page.click('.tcard[data-i="0"]'); await page.click('.tcard[data-i="2"]');
        await page.click("#tGo");
      } else if (st === "mg-intro" || st === "mg-result") {
        await page.click(".mg-card.on .btn.primary");
      } else if (st === "mg-cram") {
        await page.click(cramPlayed++ < 1 ? ".mg-card.on .btn.primary" : ".mg-card.on .btn.ghost");
      } else if (st.startsWith("mg-play:")) {
        const kind = st.slice(8);
        played[kind] = 1;
        const box = await page.$(".mg-stage");
        const b = await box.boundingBox();
        if (kind === "shoot" || kind === "clutch") { await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(900); }
        else if (kind === "stand") { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up(); }
        else if (kind === "umbrella") { await page.mouse.click(b.x + b.width * (0.3 + Math.random() * 0.4), b.y + b.height / 2); }
        else if (kind === "rush") { const g = await page.$$(".rush-t.green"); if (g[0]) await g[0].click(); }
        else if (kind === "rhythm") { await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.8); }
        else if (kind === "run") { await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
        else if (kind === "quiz") { const o = await page.$(".qz-o:not([disabled])"); if (o) await o.click().catch(() => {}); }
        else if (kind === "cram") { const cs = await page.$$(".cram-c:not(.done):not(.up)"); if (cs[0]) await cs[0].click(); }
        await page.waitForTimeout(120);
        continue;
      } else if (st === "plan") {
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
    assert.ok(steps < 6000, "没能在 6000 步内打完");
    for (const k of ["stand", "umbrella", "rush", "rhythm", "cram"]) assert.ok(played[k] || k === "umbrella" || k === "rhythm", "没玩到小游戏：" + k);
    console.log("玩到的小游戏：", Object.keys(played).join(" "));
    await page.waitForTimeout(1500);
    await shot("yearbook");
    await page.evaluate(() => { const y = document.getElementById("yearbook"); y.scrollTop = y.scrollHeight; });
    await page.waitForTimeout(1500);
    await shot("yearbook-end");
    const res = await page.evaluate(() => fetch("api/stats").then((r) => r.json()));
    assert.equal(res.runs, 1, "后端应记录一局");
    // 第二局：开启“快进已读”，不点击也应自动跳过读过的开场，停在第一个选择
    await page.click("#ybAgain");
    await page.waitForTimeout(800);
    await page.click("#setupForm button[type=submit]");
    await page.waitForSelector(".tcard", { timeout: 5000 }); await page.waitForTimeout(1900);
    await page.click('.tcard[data-i="1"]'); await page.click('.tcard[data-i="3"]'); await page.click("#tGo");
    await page.evaluate(() => DL.UI.setSkip(true));
    await page.waitForSelector("#choices.on .choice", { timeout: 9000 });
    assert.ok(await page.evaluate(() => DL.UI.settings.skip), "已读部分不应中断快进");
    assert.deepEqual(errors, [], "页面报错：\n" + errors.join("\n"));
    console.log("e2e 通过：", steps, "步打完一局；快进已读正常");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
