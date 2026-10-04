/* eslint-disable @typescript-eslint/no-require-imports */
// Faux stockage de messages parlés : toute demande de fichier « voice » reçoit le même mp3 de test (22 s de vraie voix darija).
// Sert à faire tourner la VRAIE route /api/advice (vraie météo, vrai plan, vrais en-têtes) sans Supabase ni ElevenLabs. Jamais commité.
const fs = require("fs");
const prevFetch = globalThis.fetch;
const mp3 = fs.readFileSync(process.env.MOCK_CLIP);
globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let u;
  try { u = new URL(url); } catch { return prevFetch(input, init); }
  if (u.hostname === "supabase.mock" && u.pathname.startsWith("/storage/v1/object/public/voice/")) {
    return new Response(mp3, { status: 200, headers: { "content-type": "audio/mpeg" } });
  }
  return prevFetch(input, init);
};
console.log("[mock-voice-store] actif : tout fichier « voice » = clip22.mp3");
