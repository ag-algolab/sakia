// Outils communs aux vidéos : piloter un navigateur sans fenêtre (Edge) par son protocole de débogage (CDP), sans
// dépendance. Sert à filmer le vrai site (images horodatées, sons joués, touches) et à fabriquer les images du montage.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];

export class Cdp {
  id = 0;
  waiting = new Map();
  listeners = new Map();
  constructor(ws) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id == null) {
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
        return;
      }
      const w = this.waiting.get(msg.id);
      if (!w) return;
      this.waiting.delete(msg.id);
      if (msg.error) w.fail(new Error(`${w.method} : ${msg.error.message}`));
      else w.ok(msg.result);
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((ok, fail) => {
      ws.addEventListener("open", () => ok());
      ws.addEventListener("error", () => fail(new Error("connexion au navigateur impossible")));
    });
    return new Cdp(ws);
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
    return () => this.listeners.set(method, (this.listeners.get(method) ?? []).filter((f) => f !== fn));
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, fail) => {
      this.waiting.set(id, { ok, fail, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

// Lance Edge sans fenêtre et renvoie { proc, cdp }. `userDataDir` garde le profil (service worker, stockage) d'un appel à l'autre.
export async function launch({ port = 9350, userDataDir, width = 390, height = 844, dsf = 3, mobile = true, extra = [] } = {}) {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error("Aucun navigateur trouvé (Edge ou Chrome).");
  mkdirSync(userDataDir, { recursive: true });
  const proc = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      "--lang=en-GB",
      ...extra,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let wsUrl = "";
  for (let i = 0; i < 80 && !wsUrl; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
    } catch {}
  }
  if (!wsUrl) throw new Error("le navigateur ne répond pas");
  const cdp = await Cdp.connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dsf, mobile });
  if (mobile) await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return { proc, cdp };
}

export async function waitFor(cdp, expr, timeoutMs = 20000, stepMs = 200) {
  const t0 = Date.now();
  for (;;) {
    try {
      const v = await cdp.eval(expr);
      if (v) return v;
    } catch {}
    if (Date.now() - t0 > timeoutMs) throw new Error(`attente dépassée : ${expr.slice(0, 120)}`);
    await sleep(stepMs);
  }
}

export async function goto(cdp, url, readyExpr = "document.readyState === 'complete'") {
  await cdp.send("Page.navigate", { url });
  await sleep(300);
  await waitFor(cdp, readyExpr, 30000);
}

// Script injecté dans chaque page : note chaque son lancé (instant, source) et en garde une copie (pour le remettre au montage).
export const AUDIO_HOOK = `(() => {
  if (window.__plays) return;
  window.__plays = [];
  const b64 = (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const src = this.src || this.currentSrc || ""; // src d'abord : currentSrc garde l'ancienne source tant que la nouvelle n'est pas chargée
    const rec = { t: Date.now(), src: src.slice(0, 300) };
    window.__plays.push(rec);
    if (src && !src.startsWith("data:")) fetch(src).then((r) => r.arrayBuffer()).then((b) => { rec.size = b.byteLength; rec.b64 = b64(b); }).catch((e) => { rec.err = String(e); });
    this.addEventListener("ended", () => { rec.ended = Date.now(); }, { once: true });
    this.addEventListener("pause", () => { rec.paused = Date.now(); }, { once: true });
    return orig.apply(this, arguments);
  };
})();`;

// Centre (en pixels CSS de la fenêtre) du premier élément visible dont le texte correspond, après l'avoir amené au milieu de l'écran.
export async function find(cdp, { text, selector = "button, a, [role=button], label, summary, li, input", exact = false, scroll = true, nth = 0 }) {
  const r = await cdp.eval(`(() => {
    const want = ${JSON.stringify(text)};
    const norm = (s) => (s || "").replace(/\\s+/g, " ").trim();
    const all = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((el) => {
      const b = el.getBoundingClientRect();
      if (b.width < 4 || b.height < 4) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
      // le texte visible OU le nom donné aux lecteurs d'écran (une touche « — » peut s'appeler « Read »)
      const ts = [norm(el.innerText || el.value), norm(el.getAttribute("aria-label"))];
      return ts.some((t) => (${exact} ? t === want : t.toLowerCase().includes(want.toLowerCase())));
    });
    // le plus petit élément qui correspond (le bouton lui-même, pas le bloc qui le contient), puis dans l'ordre de la page
    const area = (el) => { const b = el.getBoundingClientRect(); return b.width * b.height; };
    const exactFirst = (el) => ([norm(el.innerText || el.value), norm(el.getAttribute("aria-label"))].some((t) => t.toLowerCase() === want.toLowerCase()) ? 0 : 1);
    const leaves = all.filter((el) => !all.some((o) => o !== el && el.contains(o)));
    leaves.sort((a, b) => exactFirst(a) - exactFirst(b) || 0);
    const el = leaves[${nth}];
    void area;
    if (!el) return null;
    document.querySelectorAll("[data-cap-target]").forEach((e) => e.removeAttribute("data-cap-target"));
    el.setAttribute("data-cap-target", "1");
    if (${scroll}) el.scrollIntoView({ block: "center", behavior: "instant" });
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height, text: norm(el.innerText).slice(0, 80) };
  })()`);
  return r;
}

export class TapLog {
  taps = [];
}

// Touche à l'écran (souris, qui déclenche les mêmes clics) ; l'instant et la position sont notés pour le montage.
export async function tap(cdp, x, y, log) {
  log?.taps.push({ t: Date.now(), x, y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(90);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

// Touche un élément trouvé par son texte : la position est notée (le montage y dessine le doigt), le clic est fait dans la
// page (plus sûr qu'un clic de souris simulé, qui peut tomber pendant une animation). `real: true` : vrais évènements souris.
export async function tapText(cdp, spec, log, { pauseBefore = 350, real = false } = {}) {
  const r = await find(cdp, typeof spec === "string" ? { text: spec } : spec);
  if (!r) throw new Error(`élément introuvable : ${JSON.stringify(spec)}`);
  await sleep(pauseBefore);
  if (real) return (await tap(cdp, r.x, r.y, log), r);
  log?.taps.push({ t: Date.now(), x: r.x, y: r.y });
  await cdp.eval(`(() => { const el = document.querySelector("[data-cap-target]"); if (!el) return false; el.removeAttribute("data-cap-target"); el.click(); return true; })()`);
  return r;
}

// Défilement doux, comme un doigt (vitesse en pixels par seconde).
export async function swipe(cdp, dy, { x = 195, y = 600, speed = 900 } = {}) {
  await cdp.send("Input.synthesizeScrollGesture", { x, y, yDistance: -dy, speed, gestureSourceType: "touch", repeatCount: 1 });
}

// Défilement programmé, fluide, jusqu'à ce qu'un élément soit à une hauteur donnée de l'écran.
export async function scrollTo(cdp, { text, selector, block = 0.3, durationMs = 900 }) {
  await cdp.eval(`(async () => {
    const norm = (s) => (s || "").replace(/\\s+/g, " ").trim().toLowerCase();
    const els = [...document.querySelectorAll(${JSON.stringify(selector ?? "h1,h2,h3,section,div,p,button")})];
    const el = els.find((e) => norm(e.innerText).startsWith(${JSON.stringify((text ?? "").toLowerCase())}));
    if (!el) return false;
    const from = window.scrollY;
    const to = Math.max(0, from + el.getBoundingClientRect().top - innerHeight * ${block});
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ${durationMs});
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        window.scrollTo(0, from + (to - from) * e);
        k < 1 ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
    return true;
  })()`);
}

// Défilement programmé d'une distance donnée, fluide.
export async function scrollBy(cdp, dy, durationMs = 900) {
  await cdp.eval(`(async () => {
    const from = window.scrollY, to = from + ${dy}, t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ${durationMs});
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        window.scrollTo(0, from + (to - from) * e);
        k < 1 ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
    return true;
  })()`);
}

// Enregistreur : images de l'écran horodatées (horloge murale, comme Date.now() dans la page).
export class Recorder {
  constructor(cdp, dir, { quality = 90, maxWidth = 1170, maxHeight = 2532 } = {}) {
    this.cdp = cdp;
    this.dir = dir;
    this.opts = { quality, maxWidth, maxHeight };
    this.frames = [];
  }
  async start() {
    mkdirSync(path.join(this.dir, "frames"), { recursive: true });
    this.off = this.cdp.on("Page.screencastFrame", (p) => {
      const name = `f${String(this.frames.length).padStart(5, "0")}.jpg`;
      writeFileSync(path.join(this.dir, "frames", name), Buffer.from(p.data, "base64"));
      this.frames.push({ name, t: Math.round(p.metadata.timestamp * 1000) });
      void this.cdp.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => undefined);
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: this.opts.quality, maxWidth: this.opts.maxWidth, maxHeight: this.opts.maxHeight, everyNthFrame: 1 });
    this.t0 = Date.now();
  }
  async stop() {
    await this.cdp.send("Page.stopScreencast");
    await sleep(200);
    this.off?.();
    this.t1 = Date.now();
  }
}
