// Musique des vidéos : la même petite musique que le site (src/components/ui/bedMusic.ts : basse, arpège, charleston,
// nappe, notes pentatoniques), mais calculée hors temps réel et avec un tirage fixe : le même morceau à chaque fois,
// aucun droit d'auteur. Lancer : node scripts/video/music.mjs [graine] [secondes] [sortie.wav]
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const seed = Number(process.argv[2] ?? 7);
const seconds = Number(process.argv[3] ?? 70);
const out = path.resolve(process.argv[4] ?? `videos/build/music-${seed}.wav`);
mkdirSync(path.dirname(out), { recursive: true });

const RENDER = `(async (seed, seconds) => {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
  const PROGRESSIONS = [
    [[0,false],[7,false],[9,true],[5,false],[0,false],[7,false],[5,false],[7,false]],
    [[9,true],[5,false],[0,false],[7,false],[9,true],[5,false],[0,false],[7,false]],
    [[0,false],[4,true],[5,false],[7,false],[0,false],[4,true],[5,false],[7,false]],
    [[0,false],[5,false],[9,true],[7,false],[0,false],[5,false],[9,true],[7,false]],
    [[2,true],[7,false],[0,false],[9,true],[2,true],[7,false],[0,false],[0,false]],
    [[0,false],[9,true],[2,true],[7,false],[0,false],[9,true],[2,true],[7,false]],
  ];
  const ARPS = [[0,1,2,3,2,1,2,1],[0,2,1,3,1,2,3,2],[0,1,2,1,3,2,1,2],[0,0,2,1,3,2,3,1],[0,2,3,2,1,2,3,1]];
  const TIMBRES = [{ type: "triangle", peak: 0.2, decay: 0.22 }, { type: "sine", peak: 0.26, decay: 0.28 }, { type: "triangle", peak: 0.17, decay: 0.34 }];
  const TONICS = [0, 2, 3, 5, 7, 9, 10];
  const PENTA = [0, 2, 4, 7, 9];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const tonic = pick(TONICS), prog = pick(PROGRESSIONS);
  const bpm = 104 + Math.floor(rnd() * 14);
  const eighth = 60 / bpm / 2;
  const timbre = pick(TIMBRES), arpStart = Math.floor(rnd() * ARPS.length);
  const withHat = true, withKick = true, leadChance = 0.3 + rnd() * 0.2;
  const bus = ctx.createGain(); bus.gain.value = 0.6;
  // un peu d'espace : écho stéréo léger
  const delay = ctx.createDelay(1); delay.delayTime.value = eighth * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.22;
  const wet = ctx.createGain(); wet.gain.value = 0.18;
  const pan = ctx.createStereoPanner(); pan.pan.value = 0.35;
  bus.connect(ctx.destination); bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(pan); pan.connect(ctx.destination);
  const noise = ctx.createBuffer(1, Math.floor(sr * 0.06), sr);
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const tone = (type, f, t, peak, decay) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + decay); o.connect(g).connect(bus); o.start(t); o.stop(t + decay + 0.05); };
  const hat = (t, peak) => { const b = ctx.createBufferSource(); b.buffer = noise; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); b.connect(f).connect(g).connect(bus); b.start(t); };
  const kick = (t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(bus); o.start(t); o.stop(t + 0.25); };
  const rootOf = (off) => 41 + ((((tonic + off - 41) % 12) + 12) % 12);
  let step = 0, next = 0.05;
  while (next < seconds) {
    const barAll = Math.floor(step / 8), bar = barAll % prog.length, loop = Math.floor(barAll / prog.length), inBar = step % 8;
    const [off, minor] = prog[bar];
    const root = rootOf(off);
    const chord = [root + 12, root + 12 + (minor ? 3 : 4), root + 19, root + 24];
    const arp = ARPS[(arpStart + loop) % ARPS.length];
    tone(timbre.type, hz(chord[arp[inBar]]), next, timbre.peak, timbre.decay);
    if (inBar === 0 || inBar === 4) { tone("sine", hz(root), next, 0.34, 0.5); if (withKick) kick(next); }
    if (withHat && inBar % 2 === 1) hat(next, 0.07);
    if ((inBar === 2 || inBar === 6) && rnd() < leadChance) tone("sine", hz(72 + tonic + pick(PENTA)), next, 0.11, 0.4);
    if (inBar === 0) for (const m of [root + 12, root + 12 + (minor ? 3 : 4), root + 19]) tone("sine", hz(m), next, 0.07, eighth * 8 * 0.95);
    next += eighth; step++;
  }
  const buf = await ctx.startRendering();
  // WAV 16 bits stéréo
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * k)) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * k)) * 32767, true); }
  let bin = ""; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { b64: btoa(bin), bpm, tonic };
})`;

const { proc, cdp } = await launch({ port: 9395, userDataDir: path.join(process.env.TEMP ?? ".", "sakia-music"), width: 400, height: 300, dsf: 1, mobile: false });
try {
  await cdp.send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  const r = await cdp.eval(`${RENDER}(${seed}, ${seconds})`);
  writeFileSync(out, Buffer.from(r.b64, "base64"));
  console.log(`musique : ${out} (${seconds} s, ${r.bpm} battements/min, graine ${seed})`);
} finally {
  cdp.close();
  proc.kill();
}
