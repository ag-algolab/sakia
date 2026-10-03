// POST /api/sms/incoming   { "from": "sim-ab12cd", "text": "zitoun kairouan" }  ->  { "reply": "Sakia Kairouan : Olivier. ..." }
// Seule porte d'entrée SMS. Un vrai fournisseur s'y branche par un adaptateur (src/lib/sms/adapters.ts).
// Aucun SMS réel n'est envoyé d'ici : on renvoie seulement le texte de la réponse.

import { handleIncoming } from "@/lib/sms/handler";
import { readIncoming, replyResponse } from "@/lib/sms/adapters";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const incoming = await readIncoming(request);
  if (!incoming) {
    return Response.json({ error: 'attendu : JSON { "from": "...", "text": "..." }, 4 Ko au plus' }, { status: 400 });
  }
  const { reply } = await handleIncoming(incoming);
  return replyResponse(incoming, reply);
}
