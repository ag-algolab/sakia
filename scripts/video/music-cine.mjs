// Musique « cinéma » pour les vidéos : lente et chaleureuse (nappes douces, notes de piano espacées, basse ronde, une
// réverbération ample), qui monte doucement vers la fin. Calculée hors temps réel avec un tirage fixe : le même morceau à
// chaque fois, aucun droit d'auteur. Lancer : node scripts/video/music-cine.mjs [graine] [secondes] [sortie.wav]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const seed = Number(process.argv[2] ?? 3);
const seconds = Number(process.argv[3] ?? 75);
const out = path.resolve(process.argv[4] ?? `videos/build/music-cine-${seed}.wav`);
mkdirSync(path.dirname(out), { recursive: true });

const RENDER = `(async (seed, seconds) => {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // suite d'accords chaleureuse (vi – IV – I – V, puis I – V – vi – IV), en ré majeur, 2 mesures par accord à 68 battements/min
  const tonic = 62; // ré
  const PROG = [[9, true], [5, false], [0, false], [7, false], [0, false], [7, false], [9, true], [5, false]];
  const bpm = 68, beat = 60 / bpm, bar = beat * 4, chordLen = bar * 2;
  // bus principal, filtre doux, réverbération (réponse impulsionnelle fabriquée : bruit qui décroît en 3 s)
  const master = ctx.createGain(); master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
  master.connect(comp).connect(ctx.destination);
  const ir = ctx.createBuffer(2, sr * 3, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.42;
  verb.connect(wet).connect(master);
  const dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(master);
  const send = (node) => { node.connect(dry); node.connect(verb); };
  // la musique monte doucement : discrète au début, plus ample à partir des deux tiers
  const swell = ctx.createGain();
  swell.gain.setValueAtTime(0.0001, 0); swell.gain.exponentialRampToValueAtTime(0.75, 4); swell.gain.setValueAtTime(0.75, seconds * 0.62);
  swell.gain.linearRampToValueAtTime(1.0, seconds * 0.85); swell.gain.setValueAtTime(1.0, seconds - 3); swell.gain.linearRampToValueAtTime(0.0001, seconds);
  send(swell);
  // nappe : trois voix légèrement désaccordées par note, filtrées, attaque lente
  const pad = (midi, t, dur, vol) => {
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400; f.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 1.6); g.gain.setValueAtTime(vol, t + dur - 1.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    for (const det of [-7, 0, 6]) { const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(midi); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 1); }
    f.connect(g).connect(swell);
  };
  // piano : note claire qui décroît (fondamentale + octave + un soupçon de quinte)
  const piano = (midi, t, vol) => {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    [[1, 1], [2, 0.35], [3, 0.08]].forEach(([mul, a]) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(midi) * mul; const og = ctx.createGain(); og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + 3.3); });
    g.connect(swell);
  };
  const bass = (midi, t, dur, vol) => {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(midi);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.3); g.gain.setValueAtTime(vol, t + dur - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(swell); o.start(t); o.stop(t + dur + 0.1);
  };
  // battement de cœur très doux sur les temps 1 et 3 dans la seconde moitié
  const thump = (t, vol) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(master); o.start(t); o.stop(t + 0.4); };
  let t = 0.2, k = 0;
  while (t < seconds) {
    const [off, minor] = PROG[k % PROG.length];
    const root = tonic + off - 12;
    const chord = [root + 12, root + 12 + (minor ? 3 : 4), root + 19, root + 24];
    pad(chord[0], t, chordLen, 0.05); pad(chord[1], t, chordLen, 0.04); pad(chord[2], t, chordLen, 0.04);
    bass(root - 12, t, chordLen, 0.16);
    // arpège de piano clairsemé : une note par temps, motif qui varie, quelques silences
    for (let b = 0; b < 8; b++) {
      if (rnd() < 0.18) continue;
      const pattern = [chord[0] + 12, chord[2], chord[1] + 12, chord[2] + 12, chord[3], chord[1] + 12, chord[2], chord[3] + 12];
      piano(pattern[(b + k) % 8], t + b * beat + (rnd() - 0.5) * 0.02, 0.07 + rnd() * 0.03);
    }
    if (t > seconds * 0.45) for (let b = 0; b < 8; b += 2) thump(t + b * beat, 0.09);
    t += chordLen; k++;
  }
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const kk = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * kk)) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * kk)) * 32767, true); }
  let bin = ""; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { b64: btoa(bin), peak };
})`;

const { proc, cdp } = await launch({ port: 9396, userDataDir: path.join(process.env.TEMP ?? ".", "sakia-music-cine"), width: 400, height: 300, dsf: 1, mobile: false });
try {
  await cdp.send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  const r = await cdp.eval(`${RENDER}(${seed}, ${seconds})`);
  writeFileSync(out, Buffer.from(r.b64, "base64"));
  console.log(`musique : ${out} (${seconds} s, crête avant normalisation ${r.peak.toFixed(2)})`);
} finally {
  cdp.close();
  proc.kill();
}
