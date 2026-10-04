// Moteur du montage, côté navigateur : chaque image de la vidéo est une fonction du temps t (aucune animation CSS
// libre), pour que le rendu image par image soit exact et reproductible. Lu par compose.mjs.
// Données injectées avant ce script : window.SPEC (couches, durées), window.CLIPS (index des images filmées),
// window.MEDIA (index des vidéos d'Anthony).
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    linear: (k) => k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: (k) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
  };
  // valeur fixe, ou images clés [[t, v], ...] (t absolu en secondes), interpolées en douceur
  const kv = (v, t, ease = E.inOut) => {
    if (!Array.isArray(v)) return v;
    if (t <= v[0][0]) return v[0][1];
    for (let i = 1; i < v.length; i++) {
      if (t <= v[i][0]) {
        const [t0, a] = v[i - 1], [t1, b] = v[i];
        const k = ease(clamp((t - t0) / (t1 - t0)));
        return typeof a === "number" ? lerp(a, b, k) : Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], k)]));
      }
    }
    return v[v.length - 1][1];
  };
  // présence d'une couche : 0 avant, montée, 1, descente, 0 après
  const presence = (L, t) => {
    const fi = L.fadeIn ?? 0.35, fo = L.fadeOut ?? 0.35;
    if (t < L.start || t > L.end) return 0;
    return Math.min(fi ? E.out(clamp((t - L.start) / fi)) : 1, fo ? E.out(clamp((L.end - t) / fo)) : 1);
  };
  const el = (tag, cls, parent, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent ?? document.getElementById("stage")).appendChild(e);
    return e;
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ------------------------------------------------------------------ images filmées
  const frameAt = (index, local) => {
    // dernière image dont l'instant est <= local (recherche dichotomique)
    const ts = index.t;
    let lo = 0, hi = ts.length - 1;
    if (local <= ts[0]) return 0;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ts[mid] <= local) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const sourceIndex = (seg) => (seg.media ? window.MEDIA[seg.media] : window.CLIPS[seg.clip]);
  // le dernier morceau commencé ; une fois fini, il reste sur sa dernière image jusqu'au suivant
  // (avant : un trou entre deux morceaux renvoyait au tout premier, d'où une saute d'image)
  const segAt = (segs, t) => {
    for (let i = segs.length - 1; i >= 0; i--) if (t >= segs[i].at) return { s: segs[i], i };
    return { s: segs[0], i: 0 };
  };
  const localTime = (s, t) => Math.min(s.to, s.from + Math.max(0, t - s.at) * (s.rate ?? 1));
  const loads = [];
  const setSrc = (img, src) => {
    if (img.dataset.src === src) return;
    img.dataset.src = src;
    img.src = src;
    loads.push(img.decode().catch(() => undefined));
  };

  // ------------------------------------------------------------------ couches
  const builders = {
    bg(L) {
      const root = el("div", "bg bg-" + (L.style ?? "green"));
      const wheel = el("div", "bg-wheel", root, window.WHEEL_SVG ?? "");
      const lines = el("div", "bg-lines", root);
      for (let i = 0; i < 5; i++) el("div", "bg-line", lines);
      return (t) => {
        wheel.style.transform = `translate(-50%, -50%) rotate(${t * 6}deg)`;
        [...lines.children].forEach((ln, i) => {
          ln.style.transform = `translateX(${((t * (18 + i * 6) + i * 300) % 1200) - 600}px)`;
        });
        root.style.opacity = L.start != null ? presence(L, t) : 1;
      };
    },

    phone(L) {
      const wrap = el("div", "phone-wrap");
      const phone = el("div", "phone" + (L.desktop ? " phone-desktop" : ""), wrap);
      const screen = el("div", "phone-screen", phone);
      const imgB = el("img", "phone-img", screen);
      const imgA = el("img", "phone-img", screen);
      const taps = el("div", "taps", screen);
      // barre d'état du téléphone (heure, réseau, batterie) : la page filmée commence dessous, comme sur un vrai téléphone
      const SB = L.desktop || L.statusBar === false ? 0 : 40; // une vidéo d'écran de téléphone a déjà sa propre barre d'état
      if (!L.desktop && L.statusBar === false) el("div", "phone-notch", phone);
      if (SB) {
        // icônes dessinées comme sur un vrai téléphone : réseau (ou avion), wifi, batterie
        const signal = `<svg viewBox="0 0 18 12" width="19" height="13"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg>`;
        const plane = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;
        const wifi = `<svg viewBox="0 0 16 12" width="17" height="13"><path fill="#fff" d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0zM1.2 4.6a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0z"/></svg>`;
        const battery = `<svg viewBox="0 0 27 13" width="27" height="13"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".45"/><rect x="2.5" y="2.5" width="16" height="8" rx="2" fill="#fff"/><path d="M24.5 4.5v4a2 2 0 0 0 0-4z" fill="#fff" fill-opacity=".45"/></svg>`;
        el("div", "phone-status", screen, `<span>${L.clock ?? "9:41"}</span><span class="sb-ic">${L.offline ? plane : signal + wifi}${battery}</span>`);
        el("div", "phone-notch", phone);
        imgA.style.top = imgB.style.top = taps.style.top = SB + "px";
      }
      const W = L.desktop ? 1280 : 440, H = L.desktop ? 720 : 952;
      const vw = L.desktop ? 1536 : 390, vh = L.desktop ? 864 : 844;
      let last = -1;
      return (t) => {
        const p = presence(L, t);
        wrap.style.display = p <= 0 ? "none" : "block";
        if (p <= 0) return;
        const x = kv(L.x ?? 1330, t), y = kv(L.y ?? 540, t), sc = kv(L.scale ?? 1, t), rot = kv(L.rotate ?? 0, t);
        const enter = L.enterFrom ? E.out(clamp((t - L.start) / 0.7)) : 1;
        const dy = L.enterFrom === "bottom" ? (1 - enter) * 500 : 0;
        wrap.style.opacity = p;
        wrap.style.transform = `translate(${x}px, ${y + dy}px) translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)`;
        // contenu de l'écran : le bon morceau filmé, la bonne image, avec un fondu court entre deux morceaux
        const { s, i } = segAt(L.segments, t);
        const idx = sourceIndex(s);
        const local = localTime(s, t);
        setSrc(imgA, idx.base + idx.n[frameAt(idx, local)]);
        const since = t - s.at;
        const xf = s.xfade ?? 0.25;
        if (i > 0 && since < xf) {
          const prev = L.segments[i - 1];
          const pidx = sourceIndex(prev);
          setSrc(imgB, pidx.base + pidx.n[frameAt(pidx, prev.to)]);
          imgB.style.opacity = 1;
          imgA.style.opacity = E.inOut(clamp(since / xf));
        } else {
          imgB.style.opacity = 0;
          imgA.style.opacity = 1;
        }
        // zoom dans l'écran (recadrage) : {s: facteur, ox, oy: centre en fraction de l'écran}
        const z = kv(L.zoom ?? { s: 1, ox: 0.5, oy: 0.5 }, t);
        const zs = `translate(${(0.5 - z.ox) * W * (z.s - 1)}px, ${(0.5 - z.oy) * H * (z.s - 1)}px) scale(${z.s})`;
        imgA.style.transform = imgB.style.transform = taps.style.transform = zs;
        // doigt : un cercle qui s'ouvre là où le robot a touché
        if (L.taps !== false && !s.media) {
          const list = idx.taps ?? [];
          let html = "";
          for (const tp of list) {
            const age = local - tp.t;
            if (age < -0.05 || age > 0.65) continue;
            const k = clamp(age / 0.65);
            const r = 26 + 46 * E.out(k);
            html += `<span class="tap" style="left:${(tp.x / vw) * W}px;top:${(tp.y / vh) * H}px;width:${r * 2}px;height:${r * 2}px;opacity:${(1 - k) * 0.9}"></span>`;
          }
          if (html !== taps.dataset.h) {
            taps.innerHTML = html;
            taps.dataset.h = html;
          }
        }
        last = t;
      };
    },

    caption(L) {
      const box = el("div", "caption " + (L.cls ?? ""));
      box.style.left = L.x + "px";
      box.style.top = L.y + "px";
      if (L.w) box.style.width = L.w + "px";
      if (L.size) box.style.fontSize = L.size + "px";
      if (L.align) box.style.textAlign = L.align;
      if (L.color) box.style.color = L.color;
      const words = [];
      // **gras** et __couleur d'accent__ dans le texte
      const parts = String(L.text).split(/(\*\*[^*]+\*\*|__[^_]+__|\n)/);
      for (const part of parts) {
        if (!part) continue;
        if (part === "\n") {
          el("br", null, box);
          continue;
        }
        const strong = part.startsWith("**"), accent = part.startsWith("__");
        let raw = strong || accent ? part.slice(2, -2) : part;
        // une ponctuation collée au mot précédent ne doit jamais commencer une ligne (« every morning, » )
        const lead = !strong && !accent ? raw.match(/^([,.;:!?…»)]+)([\s\S]*)$/) : null;
        if (lead && words.length) {
          words[words.length - 1].innerHTML += esc(lead[1]);
          raw = lead[2];
        }
        for (const w of raw.split(/(\s+)/)) {
          if (!w) continue;
          if (/^\s+$/.test(w)) {
            box.appendChild(document.createTextNode(" "));
            continue;
          }
          const sp = el("span", "w" + (strong ? " strong" : "") + (accent ? " accent" : ""), box, esc(w));
          words.push(sp);
        }
      }
      const stagger = L.stagger ?? 0.09;
      const at = L.wordsAt; // instants absolus fournis par la voix off (sinon : décalage régulier)
      return (t) => {
        const p = presence({ ...L, fadeIn: 0.001 }, t);
        box.style.display = p <= 0 ? "none" : "block";
        if (p <= 0) return;
        box.style.opacity = p;
        words.forEach((w, i) => {
          const t0 = at ? at[Math.min(i, at.length - 1)] : L.start + (L.delay ?? 0) + i * stagger;
          const k = L.reveal === "fade" ? E.out(clamp((t - L.start) / 0.5)) : E.out(clamp((t - t0) / 0.32));
          w.style.opacity = k;
          w.style.transform = `translateY(${(1 - k) * 0.35}em)`;
        });
      };
    },

    chip(L) {
      const c = el("div", "chip chip-" + (L.tone ?? "real"), null, `<i></i>${esc(L.text)}`);
      c.style.left = L.x + "px";
      c.style.top = L.y + "px";
      return (t) => {
        const p = presence(L, t);
        c.style.display = p <= 0 ? "none" : "flex";
        const k = E.back(clamp((t - L.start) / 0.45));
        c.style.opacity = p;
        c.style.transform = `scale(${0.7 + 0.3 * k})`;
      };
    },

    note(L) {
      const n = el("div", "note " + (L.cls ?? ""), null, L.html ?? esc(L.text));
      n.style.left = L.x + "px";
      n.style.top = L.y + "px";
      if (L.w) n.style.width = L.w + "px";
      return (t) => {
        const p = presence(L, t);
        n.style.display = p <= 0 ? "none" : "block";
        n.style.opacity = p;
      };
    },

    html(L) {
      const n = el("div", "free " + (L.cls ?? ""), null, L.html);
      return (t) => {
        const p = presence(L, t);
        n.style.display = p <= 0 ? "none" : "block";
        n.style.opacity = p;
        const k = E.out(clamp((t - L.start) / (L.enter ?? 0.6)));
        const fx = L.fx ?? "up";
        n.style.transform = fx === "up" ? `translateY(${(1 - k) * 40}px)` : fx === "zoom" ? `scale(${0.92 + 0.08 * k})` : "none";
        // fond qui dérive (data-drift="px par seconde") : la grille d'un fond de scène avance doucement, l'image ne se fige jamais
        n.querySelectorAll("[data-drift]").forEach((c) => {
          const v = Number(c.dataset.drift) * t;
          c.style.backgroundPosition = `${v.toFixed(1)}px ${(v * 0.6).toFixed(1)}px, ${v.toFixed(1)}px ${(v * 0.6).toFixed(1)}px, 0 0`;
        });
        // éléments internes animés : data-at="secondes après le début" → apparition décalée ;
        // data-fx="pop" : surgit en rebondissant (petit, penché, puis à sa place) ; "slide" : glisse depuis la droite
        n.querySelectorAll("[data-at]").forEach((c) => {
          const dt = t - L.start - Number(c.dataset.at);
          const fx = c.dataset.fx;
          if (fx === "pop") {
            const kk = E.back(clamp(dt / 0.42));
            c.style.opacity = clamp(dt / 0.12);
            c.style.transform = `scale(${0.25 + 0.75 * kk}) rotate(${(1 - kk) * (Number(c.dataset.rot ?? -10))}deg)`;
          } else if (fx === "grow") {
            // barre qui pousse depuis la gauche
            const kk = E.out(clamp(dt / 0.9));
            c.style.opacity = clamp(dt / 0.1);
            c.style.transformOrigin = "left center";
            c.style.transform = `scaleX(${Math.max(0.001, kk)})`;
          } else if (fx === "slide") {
            const kk = E.out(clamp(dt / 0.6));
            c.style.opacity = clamp(dt / 0.25);
            c.style.transform = `translateX(${(1 - kk) * 160}px) rotate(${Number(c.dataset.rot ?? 0) * kk}deg)`;
          } else {
            const kk = E.back(clamp(dt / 0.5));
            c.style.opacity = clamp(dt / 0.3);
            c.style.transform = `translateY(${(1 - kk) * 24}px) scale(${0.9 + 0.1 * kk})`;
          }
        });
      };
    },

    image(L) {
      const box = el("div", "img-layer " + (L.cls ?? ""));
      // photo verticale (fit: "contain") : montrée entière, sur un fond flou fait d'elle-même
      if (L.fit === "contain") {
        const back = el("img", "vid-back", box);
        back.src = L.src;
      }
      const img = el("img", null, box);
      img.src = L.src;
      if (L.fit === "contain") Object.assign(img.style, { objectFit: "contain", position: "relative" });
      Object.assign(box.style, { left: (L.x ?? 0) + "px", top: (L.y ?? 0) + "px", width: (L.w ?? 1920) + "px", height: (L.h ?? 1080) + "px" });
      return (t) => {
        const p = presence(L, t);
        box.style.display = p <= 0 ? "none" : "block";
        if (p <= 0) return;
        box.style.opacity = p;
        const k = clamp((t - L.start) / (L.end - L.start));
        const kb = L.kenburns ?? { from: [1.0, 0.5, 0.5], to: [1.12, 0.5, 0.5] };
        const s = lerp(kb.from[0], kb.to[0], k), ox = lerp(kb.from[1], kb.to[1], k), oy = lerp(kb.from[2], kb.to[2], k);
        img.style.transformOrigin = `${ox * 100}% ${oy * 100}%`;
        img.style.transform = `scale(${s})`;
      };
    },

    video(L) {
      // une vidéo d'Anthony, image par image, dans un cadre (rectangle arrondi ou plein écran)
      const box = el("div", "vid-layer " + (L.cls ?? ""));
      // vidéo filmée à la verticale : on la montre entière, sur un fond flou fait de la même image
      const back = L.fit === "contain" ? el("img", "vid-back", box) : null;
      // morceau précédent, sous le courant, pendant un fondu enchaîné (segment.xfade, en secondes)
      const imgB = el("img", null, box);
      Object.assign(imgB.style, { position: "absolute", left: 0, top: 0, opacity: 0 });
      const img = el("img", null, box);
      if (back) img.style.objectFit = imgB.style.objectFit = "contain";
      // point fixe de l'avancée lente (zoom) : près du texte du film, pour qu'il ne sorte pas de l'image
      img.style.transformOrigin = imgB.style.transformOrigin = L.origin ?? "50% 50%";
      Object.assign(box.style, { left: (L.x ?? 0) + "px", top: (L.y ?? 0) + "px", width: (L.w ?? 1920) + "px", height: (L.h ?? 1080) + "px" });
      return (t) => {
        const p = presence(L, t);
        box.style.display = p <= 0 ? "none" : "block";
        if (p <= 0) return;
        box.style.opacity = p;
        const { s, i } = segAt(L.segments, t);
        const idx = window.MEDIA[s.media];
        const src = idx.base + idx.n[frameAt(idx, localTime(s, t))];
        setSrc(img, src);
        if (back) setSrc(back, src);
        const since = t - s.at;
        if (i > 0 && s.xfade && since < s.xfade) {
          const prev = L.segments[i - 1];
          const pidx = window.MEDIA[prev.media];
          setSrc(imgB, pidx.base + pidx.n[frameAt(pidx, localTime(prev, t))]);
          imgB.style.opacity = 1;
          img.style.opacity = E.inOut(clamp(since / s.xfade));
        } else {
          imgB.style.opacity = 0;
          img.style.opacity = 1;
        }
        const z = kv(L.zoom ?? 1, t);
        img.style.transform = imgB.style.transform = `scale(${z})`;
      };
    },
  };

  // lumière douce qui dérive lentement sur toute l'image : rien n'est jamais figé, même quand l'animation d'une scène
  // est finie (décision d'Anthony, 4 oct. : « l'image se bloque », à éviter de A à Z)
  builders.glow = (L) => {
    const g = el("div", "glow-layer");
    return (t) => {
      const p = presence(L, t);
      g.style.display = p <= 0 ? "none" : "block";
      if (p <= 0) return;
      const x = 50 + 34 * Math.sin(t * 0.32 + 0.6), y = 42 + 24 * Math.sin(t * 0.26 + 1.9);
      g.style.opacity = p * (L.opacity ?? 0.08);
      g.style.background = `radial-gradient(1000px 700px at ${x.toFixed(2)}% ${y.toFixed(2)}%, rgba(255,236,190,1), rgba(255,236,190,0) 70%)`;
    };
  };

  let renderers = [];
  window.__init = async () => {
    renderers = window.SPEC.layers.map((L) => builders[L.type](L));
    await document.fonts.ready;
    return true;
  };
  window.__render = async (t) => {
    loads.length = 0;
    for (const r of renderers) r(t);
    if (loads.length) await Promise.all(loads);
    await new Promise((r) => requestAnimationFrame(() => r()));
    return true;
  };
})();
