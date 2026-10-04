// Monteur : fabrique une vidéo (MP4 1920 × 1080, 30 images/s) à partir d'une « partition » (spec) : séquences filmées
// du vrai site, vidéos d'Anthony, textes animés, pastilles RÉEL / SIMULÉ, sons de l'appli, voix off, musique.
// Chaque image est calculée à son instant exact dans un navigateur sans fenêtre (rien n'est laissé au hasard), puis
// ffmpeg assemble l'image et le son.
// Lancer : node scripts/video/compose.mjs <spec.mjs> [--stills=2,10.5,30] [--from=0 --to=20] [--fps=30] [--silent]
// Sortie : videos/out/<nom>.mp4 (et videos/build/<nom>-*.png pour les images fixes de contrôle).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const args = process.argv.slice(2);
const specPath = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const flag = (k) => args.includes(`--${k}`);
if (!specPath) throw new Error("usage : node scripts/video/compose.mjs <spec.mjs> [--stills=…] [--from= --to=]");

const ROOT = path.resolve(".");
const BUILD = path.join(ROOT, "videos/build");
const OUT = path.join(ROOT, "videos/out");
mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });
const spec = (await import(pathToFileURL(path.resolve(specPath)).href + `?t=${Date.now()}`)).default;
const FPS = Number(opt("fps", spec.fps ?? 30));
const fileUrl = (p) => pathToFileURL(p).href;

// ------------------------------------------------------------------ index des images filmées et des vidéos
const clipNames = new Set();
const mediaNames = new Set();
for (const L of spec.layers) for (const s of L.segments ?? []) s.media ? mediaNames.add(s.media) : s.clip && clipNames.add(s.clip);
const CLIPS = {};
for (const name of clipNames) {
  const dir = path.join(BUILD, "capture", name);
  const meta = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"));
  const f0 = meta.frames[0].t;
  CLIPS[name] = {
    base: fileUrl(path.join(dir, "frames")) + "/",
    n: meta.frames.map((f) => f.name),
    t: meta.frames.map((f) => (f.t - f0) / 1000),
    taps: meta.taps.map((tp) => ({ t: (tp.t - f0) / 1000, x: tp.x, y: tp.y })),
    viewport: meta.viewport,
  };
}
// vidéos d'Anthony (ou autres) : extraites en images à 30/s, une fois (refaites si la source est plus récente)
const MEDIA = {};
for (const id of mediaNames) {
  const m = spec.media?.[id];
  if (!m) throw new Error(`média inconnu : ${id}`);
  const dir = path.join(BUILD, "media", id);
  const stamp = path.join(dir, ".source");
  const srcStat = statSync(m.file);
  const fresh = existsSync(stamp) && readFileSync(stamp, "utf8") === `${m.file}|${srcStat.mtimeMs}|${m.crop ?? ""}|${m.scale ?? ""}`;
  if (!fresh) {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) if (f.endsWith(".jpg")) execFileSync(process.platform === "win32" ? "cmd" : "rm", process.platform === "win32" ? ["/c", "del", "/q", path.join(dir, f)] : [path.join(dir, f)]);
    const vf = [`fps=${FPS}`, m.crop ? `crop=${m.crop}` : null, `scale=${m.scale ?? "-2:1080"}`].filter(Boolean).join(",");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", m.file, "-vf", vf, "-q:v", "3", path.join(dir, "f%05d.jpg")]);
    try {
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", m.file, "-vn", "-ac", "2", "-ar", "48000", path.join(dir, "audio.wav")]);
    } catch {
      /* pas de son */
    }
    writeFileSync(stamp, `${m.file}|${srcStat.mtimeMs}|${m.crop ?? ""}|${m.scale ?? ""}`);
  }
  const frames = readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
  MEDIA[id] = { base: fileUrl(dir) + "/", n: frames, t: frames.map((_, i) => i / FPS) };
}

// ------------------------------------------------------------------ la scène (page HTML)
const spokes = Array.from({ length: 8 }, (_, i) => i * 45)
  .map((a) => `<g transform="rotate(${a} 24 24)"><line x1="24" y1="24" x2="24" y2="7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="21" y="2.6" width="6" height="5.4" rx="1.4" fill="#f2b33d"/></g>`)
  .join("");
const WHEEL_SVG = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" fill="currentColor"/>${spokes}</svg>`;
const WAVE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60"><path d="M0 30 Q30 10 60 30 T120 30 T180 30 T240 30" fill="none" stroke="#7fc4ee" stroke-width="4"/></svg>')}`;

const CSS = `
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b1b14}
#stage{position:relative;width:1920px;height:1080px;overflow:hidden;font-family:Geist,"Segoe UI",system-ui,sans-serif;color:#f4efe6}
.bg{position:absolute;inset:0;overflow:hidden}
.bg-green{background:radial-gradient(1300px 900px at 72% 50%,#1f4a33 0%,#12301f 50%,#0b1b14 100%)}
.bg-night{background:radial-gradient(1300px 900px at 50% 45%,#16261d 0%,#0b1510 60%,#060b08 100%)}
.bg-sand{background:radial-gradient(1300px 900px at 70% 45%,#fbf6ea 0%,#f0e5cb 60%,#e3d2ab 100%);color:#24301f}
.bg-wheel{position:absolute;left:74%;top:50%;width:1250px;height:1250px;opacity:.028;color:#f4efe6}
.bg-sand .bg-wheel{color:#275233;opacity:.07}
.bg-wheel svg{width:100%;height:100%;display:block}
.bg-lines{position:absolute;left:0;right:0;bottom:-10px;height:300px;opacity:.13}
.bg-line{position:absolute;left:-600px;width:3200px;height:60px;background:url("${WAVE}") repeat-x;background-size:240px 60px}
.bg-line:nth-child(1){bottom:20px}.bg-line:nth-child(2){bottom:70px;opacity:.8}.bg-line:nth-child(3){bottom:120px;opacity:.6}.bg-line:nth-child(4){bottom:170px;opacity:.4}.bg-line:nth-child(5){bottom:220px;opacity:.25}
.phone-wrap{position:absolute;left:0;top:0;will-change:transform}
.phone{position:relative;width:472px;height:984px;border-radius:74px;background:linear-gradient(150deg,#3a403c 0%,#151916 40%,#0a0c0b 100%);box-shadow:0 60px 120px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.07) inset,0 0 0 9px #050605 inset;padding:16px;box-sizing:border-box}
.phone-screen{position:relative;width:440px;height:952px;border-radius:58px;overflow:hidden;background:#f6efe0}
.phone-desktop{width:1312px;height:752px;border-radius:26px;padding:16px}
.phone-desktop .phone-screen{width:1280px;height:720px;border-radius:12px}
.phone-img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%}
.phone-notch{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:110px;height:30px;border-radius:20px;background:#070807;z-index:3}
.phone-status{position:absolute;left:0;right:0;top:0;height:40px;z-index:2;background:#0e2418;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:6px 34px 0 40px;box-sizing:border-box;font:700 17px Geist,"Segoe UI",sans-serif;letter-spacing:.02em}
.phone-status .sb-ic{font-size:13px;letter-spacing:-1px}
.taps{position:absolute;inset:0;transform-origin:50% 50%;pointer-events:none}
.tap{position:absolute;transform:translate(-50%,-50%);border-radius:50%;border:5px solid #f2b33d;background:rgba(242,179,61,.28);box-sizing:border-box}
.caption{position:absolute;font-family:Fraunces,Georgia,serif;font-weight:800;font-size:78px;line-height:1.07;letter-spacing:-.012em;color:#f4efe6;text-wrap:balance}
.caption .w{display:inline-block;will-change:transform,opacity}
.caption .accent{color:#f2b33d}
.caption .strong{color:#fff}
.caption.small{font-family:Geist,"Segoe UI",sans-serif;font-weight:600;font-size:40px;line-height:1.28;letter-spacing:0;color:#d6e6d2}
.caption.sub{font-family:Geist,"Segoe UI",sans-serif;font-weight:700;font-size:44px;line-height:1.25;letter-spacing:0;color:#fff}
.caption.ar{font-family:Cairo,"Segoe UI",sans-serif;font-weight:700;font-size:38px;line-height:1.5;color:#cfe3d0;direction:rtl}
.caption.dark{color:#24301f}
.chip{position:absolute;display:flex;align-items:center;gap:12px;padding:11px 24px 11px 18px;border-radius:999px;font-family:Geist,"Segoe UI",sans-serif;font-weight:800;font-size:26px;letter-spacing:.09em;transform-origin:left center;white-space:nowrap}
.chip i{width:14px;height:14px;border-radius:50%;background:currentColor;display:block}
.chip-real{background:#2f7d4a;color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.18) inset}
.chip-sim{background:#f2b33d;color:#2a1d05}
.chip-info{background:rgba(255,255,255,.13);color:#f4efe6}
.note{position:absolute;font-family:Geist,"Segoe UI",sans-serif;font-size:23px;line-height:1.35;color:rgba(244,239,230,.72)}
.note.dark{color:rgba(36,48,31,.7)}
.free{position:absolute;inset:0}
.img-layer,.vid-layer{position:absolute;overflow:hidden}
.img-layer img,.vid-layer img{width:100%;height:100%;object-fit:cover;display:block}
.vid-layer.rounded{border-radius:36px;box-shadow:0 40px 90px rgba(0,0,0,.5)}
.vid-layer .vid-back,.img-layer .vid-back{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(38px) brightness(.55)}
.vid-layer img:not(.vid-back){position:relative}
.ai-label{position:absolute;right:28px;bottom:22px;font:600 20px Geist,sans-serif;color:rgba(255,255,255,.75);background:rgba(0,0,0,.35);padding:6px 12px;border-radius:8px}
${spec.css ?? ""}
`;

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800;9..144,900&family=Geist:wght@400;500;600;700;800&display=block";
const runtime = readFileSync(path.join(ROOT, "scripts/video/stage-runtime.js"), "utf8");
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div id="stage"></div>
<script>window.SPEC=${json({ layers: spec.layers.map((L) => (L.html ? { ...L, html: L.html.replaceAll("{{WHEEL}}", WHEEL_SVG) } : L)) })};window.CLIPS=${json(CLIPS)};window.MEDIA=${json(MEDIA)};window.WHEEL_SVG=${json(WHEEL_SVG)};</script>
<script>${runtime}</script></body></html>`;
const stagePath = path.join(BUILD, `stage-${spec.name}.html`);
writeFileSync(stagePath, html);

// ------------------------------------------------------------------ rendu image par image
// --audio-only : on garde l'image déjà rendue et on refait seulement le son (voix off ajoutée, réglage de volume)
if (flag("audio-only")) {
  await mix(path.join(BUILD, `${spec.name}-video.mp4`), 0, spec.duration);
  process.exit(0);
}
const { proc, cdp } = await launch({ port: Number(opt("port", 9390)), userDataDir: path.join(process.env.TEMP ?? BUILD, `sakia-compose-${opt("port", 9390)}`), width: 1920, height: 1080, dsf: 1, mobile: false, extra: ["--allow-file-access-from-files", "--disable-web-security"] });
const t0 = Date.now();
try {
  await cdp.send("Page.navigate", { url: fileUrl(stagePath) });
  for (let i = 0; i < 100; i++) {
    await sleep(200);
    try {
      if (await cdp.eval(`typeof window.__init === "function" && document.readyState === "complete"`)) break;
    } catch {}
  }
  await cdp.eval(`window.__init()`);
  const stills = opt("stills", "");
  if (stills) {
    for (const s of stills.split(",").map(Number)) {
      await cdp.eval(`window.__render(${s})`);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      const p = path.join(BUILD, `${spec.name}-${String(s).replace(".", "_")}s.png`);
      writeFileSync(p, Buffer.from(shot.data, "base64"));
      console.log(`image fixe : ${p}`);
    }
  } else {
    const from = Number(opt("from", 0));
    const to = Math.min(Number(opt("to", spec.duration)), spec.duration);
    const frames = Math.round((to - from) * FPS);
    const videoOnly = path.join(BUILD, `${spec.name}-video.mp4`);
    const enc = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", videoOnly],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise((ok, fail) => {
      enc.on("error", fail);
      enc.on("exit", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}`))));
    });
    for (let i = 0; i < frames; i++) {
      const t = from + i / FPS;
      await cdp.eval(`window.__render(${t.toFixed(4)})`);
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
      if (!enc.stdin.write(Buffer.from(shot.data, "base64"))) await new Promise((r) => enc.stdin.once("drain", r));
      if (i % 150 === 0) console.log(`  image ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    enc.stdin.end();
    await done;
    console.log(`image : ${videoOnly} (${((Date.now() - t0) / 1000).toFixed(0)} s de rendu)`);
    if (!flag("silent")) await mix(videoOnly, from, to);
  }
} finally {
  cdp.close();
  proc.kill();
}

// ------------------------------------------------------------------ son : musique, sons de l'appli, voix off
function resolveAudio(ref) {
  if (ref.startsWith("capture:")) return path.join(BUILD, "capture", ref.slice(8));
  if (ref.startsWith("media:")) return path.join(BUILD, "media", ref.slice(6), "audio.wav");
  return path.resolve(ref);
}
async function mix(videoOnly, from, to) {
  const len = to - from;
  const inputs = [];
  const filters = [];
  const labels = [];
  const events = (spec.audio ?? []).filter((a) => a.at < to && a.at + ((a.to ?? 999) - (a.from ?? 0)) > from);
  if (spec.music) {
    inputs.push("-i", resolveAudio(spec.music.file));
    const g = Math.pow(10, (spec.music.gain ?? -20) / 20);
    // la musique baisse quand quelqu'un parle (voix off, voix de l'appli)
    const duck = (spec.music.duck ?? []).map((d) => `between(t,${(d.from - from).toFixed(2)},${(d.to - from).toFixed(2)})`).join("+");
    const dk = Math.pow(10, (spec.music.duckGain ?? -9) / 20);
    filters.push(
      `[0:a]atrim=start=${(spec.music.offset ?? 0) + from}:duration=${len},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume='${g}*if(${duck || 0},${dk},1)':eval=frame,afade=t=in:st=0:d=${from > 0 ? 0.01 : spec.music.fadeIn ?? 1.2},afade=t=out:st=${Math.max(0, len - (spec.music.fadeOut ?? 2.5))}:d=${spec.music.fadeOut ?? 2.5}[mus]`,
    );
    labels.push("[mus]");
  }
  events.forEach((a, k) => {
    const i = inputs.length / 2;
    inputs.push("-i", resolveAudio(a.file));
    const st = a.from ?? 0;
    const dur = a.to != null ? a.to - st : null;
    const g = Math.pow(10, (a.gain ?? 0) / 20);
    const delay = Math.max(0, Math.round((a.at - from) * 1000));
    const trimStart = st + Math.max(0, from - a.at);
    const parts = [`atrim=start=${trimStart.toFixed(3)}${dur != null ? `:end=${(st + dur).toFixed(3)}` : ""}`, "asetpts=PTS-STARTPTS", "aformat=sample_rates=48000:channel_layouts=stereo", `volume=${g}`];
    if (a.fadeIn) parts.push(`afade=t=in:st=0:d=${a.fadeIn}`);
    if (a.fadeOut && dur != null) parts.push(`afade=t=out:st=${Math.max(0, dur - a.fadeOut).toFixed(3)}:d=${a.fadeOut}`);
    if (a.rate && a.rate !== 1) parts.push(`atempo=${a.rate}`);
    if (a.filter) parts.push(a.filter); // traitement propre à ce son (voix d'Anthony : bruit de fond, grave, compression)
    parts.push(`adelay=${delay}|${delay}`);
    filters.push(`[${i}:a]${parts.join(",")}[e${k}]`);
    labels.push(`[e${k}]`);
  });
  if (!labels.length) {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", videoOnly, "-c", "copy", path.join(OUT, `${spec.name}.mp4`)]);
    return;
  }
  filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${len},alimiter=limit=0.89[mix]`);
  const raw = path.join(BUILD, `${spec.name}-audio-raw.wav`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[mix]", "-ar", "48000", raw]);
  // volume final : on mesure la sonie moyenne et on remonte (ou baisse) d'un seul coup vers −16 LUFS, le niveau des vidéos en
  // ligne, sans écraser l'écart entre la musique et les voix ; un limiteur garde les crêtes sous −1,5 dB.
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "ebur128=framelog=quiet", "-f", "null", "-"], { encoding: "utf8" });
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr ?? "");
  const integrated = m ? Number(m[1]) : -16;
  const gain = Math.max(-10, Math.min(14, (spec.loudness ?? -16) - integrated));
  const wav = path.join(BUILD, `${spec.name}-audio.wav`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:attack=3:release=60`, "-ar", "48000", wav]);
  console.log(`son : sonie ${integrated.toFixed(1)} LUFS, corrigée de ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB`);
  const out = path.join(OUT, `${spec.name}${from > 0 || to < spec.duration ? `-${from}-${to}` : ""}.mp4`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", videoOnly, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
  const d = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
  console.log(`vidéo : ${out} (${Number(d).toFixed(2)} s)`);
}
