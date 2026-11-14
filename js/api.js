/* 宿舍人生 · 后端接口。有服务器时：全服毕业去向统计 + 毕业留言墙；纯静态部署时自动降级为本地。 */
(function (root) {
  "use strict";
  const DL = (root.DL = root.DL || {});
  let online = null;

  async function req(path, opts, ms) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms || 4000);
    try {
      const r = await fetch(path, Object.assign({ signal: ctl && ctl.signal, headers: { "Content-Type": "application/json" } }, opts));
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } finally { clearTimeout(t); }
  }

  DL.API = {
    async detect() {
      if (online !== null) return online;
      if (location.protocol === "file:") return (online = false);
      try { const r = await req("api/health", null, 1500); online = !!(r && r.ok); } catch (e) { online = false; }
      return online;
    },
    get online() { return !!online; },
    async submitRun(summary) {
      if (!(await this.detect())) return null;
      try { return await req("api/runs", { method: "POST", body: JSON.stringify(summary) }); } catch (e) { return null; }
    },
    async stats() {
      if (!(await this.detect())) return null;
      try { return await req("api/stats"); } catch (e) { return null; }
    },
    async wall() {
      if (!(await this.detect())) return null;
      try { return await req("api/wall"); } catch (e) { return null; }
    },
    async post(name, text) {
      if (!(await this.detect())) return { error: "offline" };
      try { return await req("api/wall", { method: "POST", body: JSON.stringify({ name, text }) }); } catch (e) { return { error: e.message }; }
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
