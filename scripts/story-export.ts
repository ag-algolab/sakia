// Fabrique les fichiers vidéo du film /story (MP4, 1920 × 1080, 30 images par seconde, SANS son) : le film entier et un
// morceau par chapitre, pour les monter ensuite avec la tête d'Anthony (CapCut sur téléphone, par exemple).
// Principe : un navigateur sans fenêtre (Edge) ouvre /story, se place à chaque instant du film (chaque image est une
// fonction du temps), fige les animations décoratives au même instant, prend une photo de l'écran, et ffmpeg assemble.
// Prérequis : le site tourne (npm run dev), ffmpeg et Edge installés. Rien n'est envoyé nulle part.
// Lancer : npx tsx scripts/story-export.ts [dossier de sortie] [images par seconde] [--test]

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CUTS, TOTAL } from "../src/components/story/timeline";
import { TECH_CUTS, TECH_TOTAL } from "../src/components/story/tech/timeline";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TEST = process.argv.includes("--test"); // 3 secondes seulement, pour vérifier la chaîne
const TECH = process.argv.includes("--tech"); // le film technique (/story/tech) au lieu du film principal
const OUT = args[0] ?? "C:/Users/antho/Videos/sakia-film";
const FPS = Number(args[1] ?? 30);
const FILM_TOTAL = TECH ? TECH_TOTAL : TOTAL;
const BASE = "http://localhost:3000";
const PORT = 9333;
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
];
const BROWSER = BROWSERS.find((p) => existsSync(p));
if (!BROWSER) throw new Error("Aucun navigateur trouvé (Edge, Chrome ou Brave).");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ protocole du navigateur (CDP)
class Cdp {
  private id = 0;
  private waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: Error) => void }>();
  private constructor(private ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; result?: unknown; error?: { message: string } };
      if (msg.id == null) return;
      const w = this.waiting.get(msg.id);
      if (!w) return;
      this.waiting.delete(msg.id);
      if (msg.error) w.fail(new Error(msg.error.message));
      else w.ok(msg.result);
    });
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise<void>((ok, fail) => {
      ws.addEventListener("open", () => ok());
      ws.addEventListener("error", () => fail(new Error("connexion au navigateur impossible")));
    });
    return new Cdp(ws);
  }
  send<T = unknown>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    return new Promise<T>((ok, fail) => {
      this.waiting.set(id, { ok: ok as (v: unknown) => void, fail });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval<T = unknown>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

// ------------------------------------------------------------------ ffmpeg
function ffmpeg(argv: string[]): Promise<void> {
  return new Promise((ok, fail) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("error", fail);
    p.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg a échoué (code ${code})`))));
  });
}

const ENCODE = ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const userDir = mkdtempSync(path.join(tmpdir(), "story-export-"));
  const browser = spawn(
    BROWSER!,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDir}`,
      "--window-size=1920,1080",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--no-first-run",
      "--no-default-browser-check",
      "--mute-audio",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let cdp: Cdp | null = null;
  try {
    let wsUrl = "";
    for (let i = 0; i < 60 && !wsUrl; i++) {
      await sleep(500);
      try {
        const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
        wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
      } catch {
        /* le navigateur démarre */
      }
    }
    if (!wsUrl) throw new Error("le navigateur ne répond pas");
    cdp = await Cdp.connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Page.navigate", { url: `${BASE}/story${TECH ? "/tech" : ""}?rec=1&t=0` });
    const c = cdp;

    // Attend la page, installe « aller à l'instant t », masque l'indicateur de développement de Next, attend les vraies
    // données (conseil du jour, preuve). Rappelée si la page se recharge en cours de route (autre session qui modifie le site).
    const prepare = async () => {
      for (let i = 0; i < 120; i++) {
        await sleep(500);
        try {
          if ((await c.eval<boolean>(`document.readyState === "complete" && !!document.querySelector("input[type=range]")`)) === true) break;
        } catch {
          /* la page se recharge */
        }
      }
      await c.eval(`(() => {
        const st = document.createElement("style");
        st.textContent = "nextjs-portal{display:none!important}";
        document.head.appendChild(st);
        window.__seek = async (t) => {
          const input = document.querySelector("input[type=range]");
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          set.call(input, String(t));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t * 1000; } catch (e) {} }
          return true;
        };
        return true;
      })()`);
      await c.eval(`document.fonts.ready.then(() => true)`);
      let live = TECH; // le film technique n'a pas de données du jour
      let proofLive = TECH;
      for (let i = 0; i < 50 && !(live && proofLive); i++) {
        await c.eval(`window.__seek(49)`);
        live = await c.eval<boolean>(`/live ·/i.test(document.body.innerText)`);
        await c.eval(`window.__seek(85.2)`);
        proofLive = await c.eval<boolean>(`!/values of 3 Oct/i.test(document.body.innerText)`);
        if (!(live && proofLive)) await sleep(500);
      }
      console.log(`Données : conseil du jour ${live ? "en direct" : "COPIE du 3 octobre (le moteur n'a pas répondu)"} · preuve ${proofLive ? "en direct" : "COPIE du 3 octobre"}`);
    };
    await prepare();

    // Une image : se placer à l'instant t (en se remettant en état si la page a été rechargée entre-temps).
    let recoveries = 0;
    const seek = async (t: number) => {
      for (;;) {
        try {
          await c.eval(`window.__seek(${t.toFixed(4)})`);
          return;
        } catch (e) {
          if (++recoveries > 4) throw e;
          console.log(`  la page a été rechargée (une autre session a modifié le site) : reprise à ${t.toFixed(1)} s`);
          await prepare();
        }
      }
    };

    const seconds = TEST ? 3 : FILM_TOTAL;
    const frames = Math.round(seconds * FPS);
    const full = path.join(OUT, TECH ? "tech-00-full-57s.mp4" : "00-sakia-film-full-97s.mp4");
    const target = TEST ? path.join(OUT, "test-3s.mp4") : full;

    const enc = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", ...ENCODE, target],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise<void>((ok, fail) => {
      enc.on("error", fail);
      enc.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg a échoué (code ${code})`))));
    });
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      await seek(i / FPS);
      const shot = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "jpeg", quality: 93 });
      if (!enc.stdin.write(Buffer.from(shot.data, "base64"))) await new Promise((r) => enc.stdin.once("drain", r));
      if (i % 150 === 0) console.log(`  image ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    enc.stdin.end();
    await done;
    console.log(`Film écrit : ${target}`);
    if (TEST) return;

    // Un morceau par chapitre (on enlève 0,4 s au début et à la fin : la zone du fondu enchaîné avec le chapitre voisin).
    const clips: [string, number, number][] = TECH
      ? [
          ["tech-01-intro", 0, TECH_CUTS[1] - 0.4],
          ["tech-02-four-steps", TECH_CUTS[1] + 0.4, TECH_CUTS[2] - 0.4],
          ["tech-03-small", TECH_CUTS[2] + 0.4, TECH_CUTS[3] - 0.4],
          ["tech-04-stack-and-limits", TECH_CUTS[3] + 0.4, TECH_CUTS[4] - 0.4],
          ["tech-05-safeguards", TECH_CUTS[4] + 0.4, TECH_TOTAL],
        ]
      : [
          ["01-meet-noor", 0, CUTS[1] - 0.4],
          ["02-problem-all", 11.8, 37.0],
          ["02a-problem-literacy", 11.8, 18.4],
          ["02b-problem-aquifer", 18.4, 24.9],
          ["02c-problem-sms-1-in-6", 24.9, 31.4],
          ["02d-problem-state-app", 31.4, 37.0],
          ["03-answer", CUTS[2] + 0.4, CUTS[3] - 0.4],
          ["04-channels", CUTS[3] + 0.4, CUTS[4] - 0.4],
          ["05-not-sure", CUTS[4] + 0.4, CUTS[5] - 0.4],
          ["06-proof", CUTS[5] + 0.4, CUTS[6] - 0.4],
          ["07-close-sakia", CUTS[CUTS.length - 2] + 0.4, TOTAL],
        ];
    for (const [name, a, b] of clips) {
      await ffmpeg(["-ss", a.toFixed(2), "-i", full, "-t", (b - a).toFixed(2), ...ENCODE, path.join(OUT, `${name}.mp4`)]);
      console.log(`  ${name}.mp4 (${(b - a).toFixed(1)} s)`);
    }
  } finally {
    cdp?.close();
    browser.kill();
    await sleep(500);
    try {
      rmSync(userDir, { recursive: true, force: true });
    } catch {
      /* le navigateur libère ses fichiers un peu après */
    }
  }
}

main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});
