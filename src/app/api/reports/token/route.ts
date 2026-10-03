// GET /api/reports/token : émet une identité anonyme SIGNÉE par le serveur pour un navigateur (6 par adresse et par jour).
// Elle est ensuite envoyée dans `reporter` de POST /api/reports ; le serveur refuse toute identité qu'il n'a pas émise.

import { issueReporterToken, tokenAllowed } from "@/lib/reports";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
  if (!tokenAllowed(ip)) return Response.json({ error: "trop de demandes aujourd'hui" }, { status: 429 });
  return Response.json({ reporter: issueReporterToken() });
}
