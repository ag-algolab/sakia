// Pose du présentateur : toute la géométrie des parties animées vit ICI, une seule fois.
// Presenter.tsx s'en sert pour le dessin au repos (rendu serveur compris) et BulletinPlayer pour l'animer à chaque image,
// en posant des attributs directement dans le DOM (pas de rendu React 60 fois par seconde).
//
// Repère : viewBox 0 0 240 300, visage centré en x = 120. Bouche en (120, 166), yeux en (95, 132) et (145, 132).

export const MOUTH = { x: 120, y: 166 };
export const EYE = { y: 132, left: 95, right: 145 };
export const HEAD_PIVOT = { x: 120, y: 222 }; // la tête pivote à la base du cou

const f = (n: number) => n.toFixed(2);

// Forme de la bouche selon l'ouverture (0 = fermée, 1 = grande ouverte) :
//  - au repos, un sourire doux (coins relevés, lèvres jointes) ;
//  - en parlant, le sourire s'aplatit un peu, la bouche se resserre et la lèvre du bas descend.
function shape(open: number) {
  const w = 16 - open * 3.4; // demi-largeur
  const up = 6.4 - open * 3.6; // creux de la lèvre du haut (le sourire)
  const low = up + open * 13.5; // creux de la lèvre du bas
  return { w, up, low };
}

// Bande entre deux courbes de même extrémités (les coins de la bouche) : creux `a` (haut) et `b` (bas).
const band = (w: number, a: number, b: number) =>
  `M${f(MOUTH.x - w)} ${MOUTH.y}Q${MOUTH.x} ${f(MOUTH.y + 2 * a)} ${f(MOUTH.x + w)} ${MOUTH.y}Q${MOUTH.x} ${f(MOUTH.y + 2 * b)} ${f(MOUTH.x - w)} ${MOUTH.y}Z`;

export type MouthPaths = { inner: string; teeth: string; lower: string };
export function mouthPaths(open: number): MouthPaths {
  const { w, up, low } = shape(open);
  return {
    inner: band(w, up, low), // l'intérieur (et le masque qui borne les dents et la langue)
    teeth: band(w, up, up + Math.min(4.6, open * 12)), // la rangée du haut, visible dès que la bouche s'ouvre
    lower: band(w, low, low + 3.8), // la lèvre du bas : visible aussi bouche fermée (c'est elle qui fait le sourire)
  };
}

// Langue : un dôme au fond de la bouche, bornée par le masque.
export function tongue(open: number) {
  const { low } = shape(open);
  return { cy: MOUTH.y + low - 0.5, rx: 6.5 + open * 2.5, ry: 1.5 + open * 4, opacity: Math.min(1, Math.max(0, (open - 0.22) * 4)) };
}

// Sourcils : deux arcs doux qui se lèvent un peu quand la voix monte.
export function browPath(side: "left" | "right", lift: number): string {
  const y = 107 - lift;
  const x = side === "left" ? EYE.left : EYE.right;
  const o = side === "left" ? -1 : 1; // bout extérieur
  return `M${f(x - 12)} ${f(y + (o < 0 ? 1.6 : 0))}Q${f(x)} ${f(y - 8.5)} ${f(x + 12)} ${f(y + (o < 0 ? 0 : 1.6))}`;
}

// Paupière : échelle verticale de l'œil entier autour de son centre (1 = ouvert, ~0,06 = fermé).
export function eyeTransform(cx: number, k: number): string {
  return `translate(${cx} ${EYE.y})scale(1 ${f(k)})translate(${-cx} ${-EYE.y})`;
}

// Un clignement fluide (~150 ms) à deux rythmes pour ne pas être mécanique.
export function blinkScale(now: number): number {
  const a = now % 4300;
  const b = (now + 1900) % 7100;
  const ph = a < 150 ? a / 150 : b < 150 ? b / 150 : -1;
  return ph < 0 ? 1 : 1 - 0.94 * Math.sin(Math.PI * ph);
}

export type Parts = {
  head: Element | null;
  clip: Element | null;
  mouth: Element | null;
  teeth: Element | null;
  tongue: Element | null;
  lower: Element | null;
  lips: Element | null;
  eyeL: Element | null;
  eyeR: Element | null;
  browL: Element | null;
  browR: Element | null;
};

export function findParts(svg: SVGSVGElement | null): Parts {
  const part = (n: string) => svg?.querySelector(`[data-part="${n}"]`) ?? null;
  return {
    head: part("head"),
    clip: part("clip"),
    mouth: part("mouth"),
    teeth: part("teeth"),
    tongue: part("tongue"),
    lower: part("lower"),
    lips: part("lips"),
    eyeL: part("eyeL"),
    eyeR: part("eyeR"),
    browL: part("browL"),
    browR: part("browR"),
  };
}

// Renvoie la fonction qui pose le présentateur pour une ouverture de bouche et un instant donnés.
// `calm` (prefers-reduced-motion) : plus de balancement ni de hochement de tête, ni de sourcils qui bougent ;
// la bouche suit toujours la voix, c'est elle qui porte l'information.
export function createPose(p: Parts) {
  let last = -1;
  return (open: number, now: number, calm: boolean) => {
    // la bouche : seulement quand l'ouverture a changé (au repos, rien à réécrire)
    if (Math.abs(open - last) > 0.004) {
      last = open;
      const m = mouthPaths(open);
      p.mouth?.setAttribute("d", m.inner);
      p.lips?.setAttribute("d", m.inner);
      p.clip?.setAttribute("d", m.inner);
      p.teeth?.setAttribute("d", m.teeth);
      p.lower?.setAttribute("d", m.lower);
      const t = tongue(open);
      p.tongue?.setAttribute("cy", f(t.cy));
      p.tongue?.setAttribute("rx", f(t.rx));
      p.tongue?.setAttribute("ry", f(t.ry));
      p.tongue?.setAttribute("opacity", f(t.opacity));
      const lift = calm ? 0 : open * 2.4;
      p.browL?.setAttribute("d", browPath("left", lift));
      p.browR?.setAttribute("d", browPath("right", lift));
    }
    // la tête : un très léger balancement au repos, un petit hochement quand la voix est forte
    const sway = calm ? 0 : Math.sin(now / 1700) * 1.1 + Math.sin(now / 5300) * 0.7;
    const nod = calm ? 0 : -open * 1.4;
    p.head?.setAttribute("transform", `translate(0 ${f(nod)})rotate(${f(sway)} ${HEAD_PIVOT.x} ${HEAD_PIVOT.y})`);
    const k = blinkScale(now);
    p.eyeL?.setAttribute("transform", eyeTransform(EYE.left, k));
    p.eyeR?.setAttribute("transform", eyeTransform(EYE.right, k));
  };
}
