// Dessins des 18 cultures, en vectoriel : quelques centaines d'octets chacun, AUCUN téléchargement (ils marchent sans internet
// et s'affichent instantanément). Style à plat, formes simples et couleurs franches, reconnaissables sans lire.
// Identifiants = ceux de src/lib/crops.ts.

type P = { id: string; className?: string };

// Un épi : des paires de grains le long d'une tige. Avec `awns`, de longues barbes (orge).
function Ear({ x, y, rot = 0, color, awns = false, n = 5 }: { x: number; y: number; rot?: number; color: string; awns?: boolean; n?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: n }, (_, k) => (
        <g key={k} transform={`translate(0 ${-k * 4.6})`}>
          <ellipse cx="-2.6" cy="0" rx="2.2" ry="3.4" transform="rotate(-24 -2.6 0)" fill={color} />
          <ellipse cx="2.6" cy="0" rx="2.2" ry="3.4" transform="rotate(24 2.6 0)" fill={color} />
          {awns && (
            <>
              <path d="M-3.4 -2 L-9 -11" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
              <path d="M3.4 -2 L9 -11" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
            </>
          )}
        </g>
      ))}
      <ellipse cx="0" cy={-n * 4.6 + 1} rx="2" ry="3.4" fill={color} />
      {awns && <path d={`M0 ${-n * 4.6} L0 ${-n * 4.6 - 11}`} stroke={color} strokeWidth="0.9" strokeLinecap="round" />}
    </g>
  );
}

function Leaf({ d, c = "#4aa263" }: { d: string; c?: string }) {
  return <path d={d} fill={c} />;
}

export default function CropArt({ id, className }: P) {
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 64 64" aria-hidden className={className} xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
  switch (id) {
    case "ble":
      return svg(
        <>
          <g stroke="#c9952b" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M32 61 V24" />
            <path d="M32 61 C29 46 22 40 19 28" />
            <path d="M32 61 C35 46 42 40 45 28" />
          </g>
          <Ear x={32} y={26} color="#e2b04a" />
          <Ear x={19} y={30} rot={-14} color="#d9a441" n={4} />
          <Ear x={45} y={30} rot={14} color="#d9a441" n={4} />
        </>,
      );
    case "orge":
      return svg(
        <>
          <g stroke="#b99a3c" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M32 61 V26" />
            <path d="M32 61 C29 48 23 42 21 30" />
            <path d="M32 61 C35 48 41 42 43 30" />
          </g>
          <Ear x={32} y={28} color="#d6b35a" awns n={4} />
          <Ear x={21} y={32} rot={-12} color="#c9a64a" awns n={3} />
          <Ear x={43} y={32} rot={12} color="#c9a64a" awns n={3} />
        </>,
      );
    case "tomate":
      return svg(
        <>
          <circle cx="32" cy="37" r="21" fill="#e5432f" />
          <ellipse cx="24" cy="29" rx="6" ry="3.4" transform="rotate(-30 24 29)" fill="#fff" opacity=".32" />
          <path d="M32 58 a21 21 0 0 0 20 -16 a24 24 0 0 1 -40 0 a21 21 0 0 0 20 16z" fill="#c7351f" opacity=".5" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-4" rx="2.6" ry="7" transform={`translate(32 18) rotate(${a})`} fill="#4a8f3c" />
          ))}
          <rect x="31" y="8" width="2.4" height="8" rx="1.2" fill="#3f7d31" />
        </>,
      );
    case "piment":
      return svg(
        <>
          <path d="M20 20 C12 40 26 58 48 54 C52 53 51 49 47 48 C36 46 33 34 36 21 C30 17 24 17 20 20z" fill="#d8302a" />
          <path d="M23 24 C19 38 27 50 40 52" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M19 21 C17 13 22 8 29 9 C31 13 29 17 27 20z" fill="#3f8f3a" />
          <path d="M24 12 C26 8 30 6 32 5" stroke="#3f8f3a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>,
      );
    case "pomme-de-terre":
      return svg(
        <>
          <ellipse cx="30" cy="40" rx="20" ry="13" transform="rotate(-14 30 40)" fill="#b98a55" />
          <ellipse cx="46" cy="22" rx="10" ry="8" transform="rotate(20 46 22)" fill="#c49a64" />
          <ellipse cx="16" cy="24" rx="9" ry="7" transform="rotate(-24 16 24)" fill="#c49a64" />
          <g fill="#7d5a30">
            <circle cx="22" cy="38" r="1.6" />
            <circle cx="33" cy="43" r="1.6" />
            <circle cx="39" cy="36" r="1.5" />
            <circle cx="46" cy="23" r="1.3" />
            <circle cx="15" cy="24" r="1.3" />
          </g>
          <ellipse cx="24" cy="33" rx="7" ry="2.4" transform="rotate(-14 24 33)" fill="#fff" opacity=".22" />
        </>,
      );
    case "pasteque":
      return svg(
        <>
          <path d="M6 28 A26 26 0 0 0 58 28 Z" fill="#2f8f4e" />
          <path d="M10 28 A22 22 0 0 0 54 28 Z" fill="#e9f3cf" />
          <path d="M13 28 A19 19 0 0 0 51 28 Z" fill="#ea4a55" />
          <g fill="#2b2b2b">
            {[[24, 36], [32, 42], [40, 36], [28, 32], [37, 31]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.6" transform={`rotate(${i % 2 ? 20 : -20} ${x} ${y})`} />
            ))}
          </g>
          <rect x="6" y="26" width="52" height="3" rx="1.5" fill="#2f8f4e" />
        </>,
      );
    case "melon":
      return svg(
        <>
          <circle cx="32" cy="35" r="22" fill="#e6cf6f" />
          <g stroke="#bfa645" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M32 13 C21 25 21 45 32 57" />
            <path d="M32 13 C43 25 43 45 32 57" />
            <path d="M32 13 V57" />
            <path d="M11 35 Q32 42 53 35" />
            <path d="M15 23 Q32 29 49 23" />
            <path d="M15 47 Q32 53 49 47" />
          </g>
          <ellipse cx="24" cy="26" rx="5" ry="3" transform="rotate(-35 24 26)" fill="#fff" opacity=".3" />
          <rect x="30.6" y="8" width="2.8" height="7" rx="1.4" fill="#6b7a2e" />
        </>,
      );
    case "oignon":
      return svg(
        <>
          <path d="M32 15 C40 23 53 30 53 41 C53 51 44 58 32 58 C20 58 11 51 11 41 C11 30 24 23 32 15Z" fill="#c26cb6" />
          <g stroke="#e9b8e2" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8">
            <path d="M32 16 C24 28 22 44 32 57" />
            <path d="M32 16 C40 28 42 44 32 57" />
          </g>
          <path d="M32 16 C29 9 30 5 33 2 C36 6 35 11 32 16z" fill="#4aa263" />
          <path d="M26 57 l-2 4 M32 58 v4 M38 57 l2 4" stroke="#8a6a4a" strokeWidth="1.6" strokeLinecap="round" />
        </>,
      );
    case "sorgho":
      return svg(
        <>
          <path d="M32 62 V28" stroke="#6b8a3a" strokeWidth="3" strokeLinecap="round" />
          <Leaf d="M32 52 C20 50 12 40 8 32 C20 34 30 40 32 52z" />
          <Leaf d="M32 44 C44 42 52 32 56 24 C44 26 34 32 32 44z" c="#3f9055" />
          <ellipse cx="32" cy="17" rx="10" ry="15" fill="#a8472a" />
          <g fill="#d27a4a">
            {[[27, 8], [34, 9], [24, 15], [31, 15], [38, 16], [27, 22], [34, 22], [31, 28]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.6" />
            ))}
          </g>
        </>,
      );
    case "olivier":
      return svg(
        <>
          <path d="M6 54 C22 46 40 32 58 12" stroke="#7a6542" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          {[[14, 49, -50], [22, 44, 50], [28, 39, -45], [35, 33, 55], [42, 27, -45], [49, 20, 55], [55, 14, -40]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="2.8" ry="9" transform={`rotate(${r} ${x} ${y})`} fill="#6f9a5a" />
          ))}
          {[[24, 54], [36, 46], [46, 40]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x - 2} ${y - 9} L${x} ${y - 5}`} stroke="#7a6542" strokeWidth="1.4" />
              <ellipse cx={x} cy={y} rx="5" ry="6.4" fill="#3e4a2c" />
              <ellipse cx={x - 1.6} cy={y - 2} rx="1.4" ry="2.2" fill="#fff" opacity=".35" />
            </g>
          ))}
        </>,
      );
    case "amandier":
      return svg(
        <>
          <path d="M22 12 C35 12 41 30 35 46 C31 57 20 55 16 44 C12 32 14 12 22 12Z" fill="#d6ac72" />
          <path d="M22 16 C20 30 22 44 27 52" stroke="#b38449" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M44 28 C52 30 54 42 49 51 C46 57 40 55 38 49 C36 42 38 28 44 28Z" fill="#c99a60" />
          <g transform="translate(47 15)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-5.4" rx="3.6" ry="5.2" transform={`rotate(${a})`} fill="#f6b7c8" />
            ))}
            <circle r="2.6" fill="#f2b33d" />
          </g>
        </>,
      );
    case "pistachier":
      return svg(
        <>
          <ellipse cx="26" cy="36" rx="13" ry="19" transform="rotate(-14 26 36)" fill="#e6d6ad" />
          <ellipse cx="26" cy="36" rx="7" ry="13" transform="rotate(-14 26 36)" fill="#89b43e" />
          <path d="M27 22 C22 32 22 42 24 50" stroke="#d1bf91" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="38" rx="9" ry="14" transform="rotate(16 46 38)" fill="#d9c895" />
          <ellipse cx="46" cy="36" rx="4.6" ry="9" transform="rotate(16 46 36)" fill="#9bc24f" />
          <ellipse cx="22" cy="28" rx="2.4" ry="4" transform="rotate(-14 22 28)" fill="#fff" opacity=".3" />
        </>,
      );
    case "vigne":
      return svg(
        <>
          <path d="M32 16 V10" stroke="#7a5a3a" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 11 C40 4 52 6 56 14 C50 18 40 18 33 11z" fill="#4aa263" />
          <g fill="#6a3d9a">
            {[[16, 24], [26, 24], [36, 24], [46, 24], [21, 33], [31, 33], [41, 33], [26, 42], [36, 42], [31, 51]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="5.6" />
            ))}
          </g>
          <g fill="#fff" opacity=".35">
            {[[14, 22], [24, 22], [34, 22], [44, 22], [19, 31], [29, 31], [39, 31]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.5" />
            ))}
          </g>
        </>,
      );
    case "oranger":
      return svg(
        <>
          <circle cx="32" cy="37" r="21" fill="#f39a1e" />
          <ellipse cx="24" cy="29" rx="6" ry="3.4" transform="rotate(-30 24 29)" fill="#fff" opacity=".32" />
          <g fill="#d4780f" opacity=".55">
            {[[22, 40], [30, 46], [40, 40], [34, 32], [44, 48], [20, 48]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="0.9" />
            ))}
          </g>
          <path d="M32 17 C36 8 47 7 52 12 C48 19 39 21 32 17z" fill="#4aa263" />
          <rect x="31" y="12" width="2.4" height="7" rx="1.2" fill="#6b5a2e" />
        </>,
      );
    case "dattier":
      return svg(
        <>
          <path d="M32 62 C30 48 34 38 32 26" stroke="#8a5a2b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <g stroke="#3f9055" strokeWidth="3.6" strokeLinecap="round" fill="none">
            <path d="M32 26 C20 12 9 15 5 24" />
            <path d="M32 26 C22 10 14 8 8 11" />
            <path d="M32 26 C44 12 55 15 59 24" />
            <path d="M32 26 C42 10 50 8 56 11" />
            <path d="M32 26 C28 14 28 8 31 3" />
            <path d="M32 26 C38 14 38 8 35 3" />
          </g>
          <g fill="#8a4a1f">
            {[[27, 30], [33, 32], [38, 29], [30, 36]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="2.6" ry="3.6" />
            ))}
          </g>
        </>,
      );
    case "grenadier":
      return svg(
        <>
          <circle cx="32" cy="37" r="21" fill="#c0392b" />
          <path d="M32 58 a21 21 0 0 0 20 -16 a24 24 0 0 1 -40 0 a21 21 0 0 0 20 16z" fill="#8e2a20" opacity=".5" />
          <ellipse cx="23" cy="30" rx="6" ry="3.4" transform="rotate(-30 23 30)" fill="#fff" opacity=".3" />
          <path d="M23 19 L26 10 L30 16 L34 9 L38 16 L42 10 L43 19 Z" fill="#a52f22" />
          <path d="M26 19 h16" stroke="#7b2018" strokeWidth="1.6" />
        </>,
      );
    case "figuier":
      return svg(
        <>
          <path d="M32 14 C42 24 52 31 50 43 C48 53 41 59 32 59 C23 59 16 53 14 43 C12 31 22 24 32 14Z" fill="#7a4a8a" />
          <path d="M32 18 C26 30 22 44 32 58 M32 18 C38 30 42 44 32 58" stroke="#a574b4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8" />
          <ellipse cx="24" cy="36" rx="3" ry="6" transform="rotate(20 24 36)" fill="#fff" opacity=".25" />
          <rect x="30.6" y="6" width="2.8" height="10" rx="1.4" fill="#6b7a2e" />
          <path d="M33 9 C40 3 50 4 54 10 C48 14 40 14 33 9z" fill="#4aa263" />
        </>,
      );
    case "luzerne":
      return svg(
        <>
          <g stroke="#3f9055" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M32 62 C32 48 30 34 30 20" />
            <path d="M32 62 C34 50 40 40 44 28" />
            <path d="M32 62 C30 52 24 44 20 34" />
          </g>
          {[[30, 40], [31, 52], [40, 40], [25, 46], [34, 28], [22, 36]].map(([x, y], i) => (
            <g key={i} fill="#4aa263">
              <ellipse cx={x - 4} cy={y} rx="3.4" ry="2.2" />
              <ellipse cx={x + 4} cy={y} rx="3.4" ry="2.2" />
              <ellipse cx={x} cy={y - 3.6} rx="2.4" ry="3.4" />
            </g>
          ))}
          <g fill="#8a5cc7">
            {[[30, 14], [27, 10], [33, 10], [30, 6], [44, 22], [41, 18], [47, 18]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.8" />
            ))}
          </g>
        </>,
      );
    default:
      // culture sans dessin : une jeune pousse
      return svg(
        <>
          <path d="M32 58 V30" stroke="#3f9055" strokeWidth="3" strokeLinecap="round" />
          <Leaf d="M32 36 C18 36 10 26 10 16 C24 16 32 24 32 36z" />
          <Leaf d="M32 30 C44 30 54 22 54 12 C42 12 32 18 32 30z" c="#3f9055" />
        </>,
      );
  }
}
