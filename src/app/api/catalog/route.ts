// GET /api/catalog : régions et cultures disponibles (pour les listes déroulantes, le bot et le téléphone SMS).

import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";

export async function GET() {
  return Response.json({
    regions: REGIONS.map(({ id, nameFr, nameAr }) => ({ id, nameFr, nameAr })),
    crops: CROPS.map(({ id, nameFr, nameAr, nameEn, kind, status }) => ({ id, nameFr, nameAr, nameEn, kind, status })),
  });
}
