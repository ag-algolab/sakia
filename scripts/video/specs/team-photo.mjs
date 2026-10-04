// La « photo d'équipe » demandée par HackOS : la photo d'Anthony (seul fondateur) mise en page avec Sakia, en une image.
// Photo : videos/assets/team/team-photo.jpg (à défaut, une image de sa vidéo face caméra).
// Rendu : node scripts/video/compose.mjs scripts/video/specs/team-photo.mjs --stills=1 → videos/build/sakia-team-photo-1s.png
import { existsSync } from "node:fs";
import path from "node:path";

const PHOTO = ["videos/assets/team/team-photo.jpg", "videos/assets/team/team-photo-fallback.jpg"].find((f) => existsSync(f));
const url = (p) => "file:///" + path.resolve(p).replace(/\\/g, "/");

export default {
  name: "sakia-team-photo",
  fps: 30,
  duration: 2,
  css: `
    .tp-frame{border-radius:36px;box-shadow:0 40px 90px rgba(0,0,0,.55)}
    .tp{position:absolute;left:1060px;top:0;bottom:0;width:780px;display:flex;flex-direction:column;justify-content:center}
    .tp .w{width:120px;height:120px;color:#f4efe6}.tp .w svg{width:100%;height:100%}
    .tp .k{margin-top:26px;font:800 28px Geist,sans-serif;letter-spacing:.16em;color:#f2b33d}
    .tp h1{margin:10px 0 0;font:900 120px/1 Fraunces,serif;color:#fff;letter-spacing:-.02em}
    .tp h2{margin:34px 0 0;font:800 56px/1.1 Fraunces,serif;color:#fff}
    .tp p{margin:14px 0 0;font:600 30px/1.4 Geist,sans-serif;color:#d6e6d2}
    .tp .u{margin-top:40px;align-self:flex-start;padding:14px 28px;border-radius:999px;background:rgba(255,255,255,.1);font:700 30px Geist,sans-serif;color:#fff}
  `,
  layers: [
    { type: "bg", style: "green" },
    ...(PHOTO ? [{ type: "image", start: 0, end: 2, fadeIn: 0.001, fadeOut: 0.001, src: url(PHOTO), x: 90, y: 60, w: 900, h: 960, cls: "tp-frame", kenburns: { from: [1, 0.5, 0.4], to: [1, 0.5, 0.4] } }] : []),
    {
      type: "html", start: 0, end: 2, fadeIn: 0.001, fadeOut: 0.001, fx: "none",
      html: `<div class="tp"><div class="w">{{WHEEL}}</div><div class="k">SMALL AI FOR DEVELOPMENT</div><h1>Team Sakia</h1><h2>Anthony Gocmen</h2><p>Founder, AG Algo Lab<br>Master's student, Université Paris Dauphine – PSL, Tunis campus<br>Arena FIDE Master</p><div class="u">sakia-opal.vercel.app</div></div>`,
    },
  ],
};
