// Petite musique de fond « flash info », fabriquée dans le navigateur avec Web Audio : aucun fichier à télécharger,
// aucun droit d'auteur, quelques Ko de code. Entraînante et douce : basse, arpège, charleston léger, nappe, et de
// petites notes de mélodie au hasard. Elle reste volontairement basse : elle sert à ce qu'une voix seule ne « endorme »
// pas, pas à couvrir la voix.
//
// CHAQUE ÉCOUTE EST DIFFÉRENTE : tonalité, tempo, suite d'accords, motif d'arpège, timbre, présence du charleston et de
// la grosse caisse, et mélodie sont tirés au hasard à chaque lancement (jamais la même suite d'accords deux fois de
// suite). Pendant une même écoute, le motif change à chaque tour et la mélodie est tirée au sort note par note.
//
// Usage : start() DANS le geste de la personne (le navigateur l'exige), duck() quand la voix commence,
// swell() quand elle finit, puis stop(fadeMs). Réutilisable par /bulletin : même API.

export type BedMusic = {
  duck: () => void; // la voix parle : musique très basse
  swell: () => void; // la voix a fini : la musique remonte un instant
  stop: (fadeMs?: number) => void;
};

const LEVEL = { intro: 0.6, voice: 0.28, outro: 0.5 };

// Suites d'accords sur 8 mesures. Chaque accord : décalage de la racine par rapport à la tonique (en demi-tons) et mineur ou non.
type Chord = [offset: number, minor: boolean];
const PROGRESSIONS: Chord[][] = [
  // I  V  vi IV  I  V  IV  V   (classique, lumineux)
  [[0, false], [7, false], [9, true], [5, false], [0, false], [7, false], [5, false], [7, false]],
  // vi IV I  V  (pop)
  [[9, true], [5, false], [0, false], [7, false], [9, true], [5, false], [0, false], [7, false]],
  // I  iii IV  V
  [[0, false], [4, true], [5, false], [7, false], [0, false], [4, true], [5, false], [7, false]],
  // I  IV vi  V
  [[0, false], [5, false], [9, true], [7, false], [0, false], [5, false], [9, true], [7, false]],
  // ii V  I  vi (jazzy léger)
  [[2, true], [7, false], [0, false], [9, true], [2, true], [7, false], [0, false], [0, false]],
  // I  vi ii V  (turnaround)
  [[0, false], [9, true], [2, true], [7, false], [0, false], [9, true], [2, true], [7, false]],
];

// Motifs d'arpège : à chaque croche, quelle note de l'accord (0 fondamentale, 1 tierce, 2 quinte, 3 octave)
const ARPS = [
  [0, 1, 2, 3, 2, 1, 2, 1],
  [0, 2, 1, 3, 1, 2, 3, 2],
  [0, 1, 2, 1, 3, 2, 1, 2],
  [0, 0, 2, 1, 3, 2, 3, 1],
  [0, 2, 3, 2, 1, 2, 3, 1],
];

const TIMBRES: { type: OscillatorType; peak: number; decay: number }[] = [
  { type: "triangle", peak: 0.2, decay: 0.22 },
  { type: "sine", peak: 0.26, decay: 0.28 },
  { type: "triangle", peak: 0.17, decay: 0.34 },
];

const TONICS = [0, 2, 3, 5, 7, 9, 10]; // do, ré, ré#, fa, sol, la, la# : tonalités agréables à cette hauteur
const PENTA = [0, 2, 4, 7, 9]; // gamme pentatonique majeure pour les petites notes de mélodie

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

// Dernière suite d'accords jouée (par appareil) : on n'en rejoue jamais deux fois de suite la même.
const LAST_KEY = "sakia-music-last";
function pickProgression(): number {
  let last = -1;
  try {
    last = Number(sessionStorage.getItem(LAST_KEY) ?? localStorage.getItem(LAST_KEY) ?? -1);
  } catch {}
  let i = Math.floor(Math.random() * PROGRESSIONS.length);
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (PROGRESSIONS.length - 1))) % PROGRESSIONS.length;
  try {
    localStorage.setItem(LAST_KEY, String(i));
  } catch {}
  return i;
}

export function startBedMusic(): BedMusic | null {
  const Ctx: typeof AudioContext | undefined =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctx) return null;
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return null;
  }
  void ctx.resume();

  // le « morceau » de cette écoute
  const tonic = pick(TONICS);
  const prog = PROGRESSIONS[pickProgression()];
  const bpm = 100 + Math.floor(Math.random() * 23); // 100 à 122
  const eighth = 60 / bpm / 2;
  const timbre = pick(TIMBRES);
  const arpStart = Math.floor(Math.random() * ARPS.length);
  const withHat = Math.random() < 0.8;
  const withKick = Math.random() < 0.75;
  const leadChance = 0.25 + Math.random() * 0.3;

  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(ctx.destination);
  const setLevel = (v: number, tc = 0.35) => bus.gain.setTargetAtTime(v, ctx.currentTime, tc);
  setLevel(LEVEL.intro, 0.5);

  // bruit pour le charleston
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const tone = (type: OscillatorType, freq: number, t: number, peak: number, decay: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + decay + 0.05);
  };

  const hat = (t: number, peak: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
  };

  const kick = (t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.25);
  };

  // racine d'accord ramenée dans la zone grave 41 à 52 (fa grave à mi grave)
  const rootOf = (offset: number) => 41 + ((((tonic + offset - 41) % 12) + 12) % 12);

  let step = 0;
  let next = ctx.currentTime + 0.1;
  const schedule = () => {
    while (next < ctx.currentTime + 0.35) {
      const barAll = Math.floor(step / 8);
      const bar = barAll % prog.length;
      const loop = Math.floor(barAll / prog.length);
      const inBar = step % 8;
      const [off, minor] = prog[bar];
      const root = rootOf(off);
      const chord = [root + 12, root + 12 + (minor ? 3 : 4), root + 12 + 7, root + 24];
      const arp = ARPS[(arpStart + loop) % ARPS.length]; // le motif change à chaque tour

      tone(timbre.type, hz(chord[arp[inBar]]), next, timbre.peak, timbre.decay);
      // basse sur les temps 1 et 3, grosse caisse douce
      if (inBar === 0 || inBar === 4) {
        tone("sine", hz(root), next, 0.34, 0.5);
        if (withKick) kick(next);
      }
      // charleston sur les contretemps
      if (withHat && inBar % 2 === 1) hat(next, 0.07);
      // mélodie : quelques notes de gamme pentatonique tirées au sort, sur les temps 2 et 4
      if ((inBar === 2 || inBar === 6) && Math.random() < leadChance) {
        tone("sine", hz(72 + tonic + pick(PENTA)), next, 0.11, 0.4);
      }
      // nappe douce au début de chaque mesure
      if (inBar === 0) {
        for (const m of [root + 12, root + 12 + (minor ? 3 : 4), root + 19]) tone("sine", hz(m), next, 0.07, eighth * 8 * 0.95);
      }
      next += eighth;
      step++;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 100);

  let closed = false;
  return {
    duck: () => !closed && setLevel(LEVEL.voice, 0.6),
    swell: () => !closed && setLevel(LEVEL.outro, 0.4),
    stop: (fadeMs = 800) => {
      if (closed) return;
      closed = true;
      window.clearInterval(timer);
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.02, fadeMs / 4000));
      window.setTimeout(() => void ctx.close(), fadeMs + 250);
    },
  };
}
