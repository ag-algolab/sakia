// Adaptateurs entre un fournisseur de SMS et handleIncoming(). Brancher un vrai fournisseur = ajouter un cas ici.
//   - JSON { from, text }             : le faux téléphone, les tests, curl
//   - formulaire { from, text }       : forme courante des fournisseurs de SMS
//   - formulaire { From, Body } (Twilio) : réponse attendue en TwiML (XML)
// Ne vérifie PAS la signature du fournisseur : à ajouter avant tout branchement réel (voir docs/NOTES-telephone.md).

export type Incoming = { from: string; text: string; style: "json" | "twiml" };

const MAX_BODY = 4096; // octets : un SMS en fait 160 caractères

export async function readIncoming(request: Request): Promise<Incoming | null> {
  const type = request.headers.get("content-type") ?? "";
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return null;
  try {
    const body = (await request.text()).slice(0, MAX_BODY);
    // curl -d envoie « application/x-www-form-urlencoded » même pour du JSON : on reconnaît le JSON à son contenu
    if (type.includes("application/json") || body.trimStart().startsWith("{")) {
      const j = JSON.parse(body) as { from?: unknown; text?: unknown };
      return typeof j.text === "string" ? { from: typeof j.from === "string" ? j.from : "", text: j.text, style: "json" } : null;
    }
    if (type.includes("application/x-www-form-urlencoded")) {
      const f = new URLSearchParams(body);
      const twilio = f.has("Body");
      const text = f.get(twilio ? "Body" : "text");
      return text == null ? null : { from: f.get(twilio ? "From" : "from") ?? "", text, style: twilio ? "twiml" : "json" };
    }
  } catch {
    // corps illisible : refusé plus bas
  }
  return null;
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function replyResponse(incoming: Incoming, reply: string): Response {
  if (incoming.style === "twiml") {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(reply)}</Message></Response>`, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
  return Response.json({ reply });
}
