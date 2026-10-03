// Sons du faux téléphone (Web Audio) : tonalité des touches (DTMF) et sonnerie d'attente. Aucun fichier : de simples sinusoïdes.

const ROWS = [697, 770, 852, 941];
const COLS = [1209, 1336, 1477];
const LAYOUT = ["123", "456", "789", "*0#"];

export function dtmfFrequencies(key: string): [number, number] | null {
  for (let r = 0; r < LAYOUT.length; r++) {
    const c = LAYOUT[r].indexOf(key);
    if (c >= 0) return [ROWS[r], COLS[c]];
  }
  return null;
}

function beep(ctx: AudioContext, freqs: number[], start: number, seconds: number, volume: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.008);
  gain.gain.setValueAtTime(volume, start + seconds - 0.012);
  gain.gain.linearRampToValueAtTime(0, start + seconds);
  gain.connect(ctx.destination);
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }
}

export function playKeyTone(ctx: AudioContext | null, key: string) {
  const f = dtmfFrequencies(key);
  if (!ctx || !f) return;
  beep(ctx, f, ctx.currentTime, 0.09, 0.07);
}

// Sonnerie de retour d'appel : deux tonalités de 425 Hz.
export function playRingback(ctx: AudioContext | null): number {
  if (!ctx) return 0;
  const t = ctx.currentTime;
  beep(ctx, [425], t, 0.4, 0.06);
  beep(ctx, [425], t + 0.55, 0.4, 0.06);
  return 1100; // durée en ms
}
