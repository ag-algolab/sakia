import type { Metadata } from "next";

// La page Preuve est un composant client (elle ne peut pas déclarer sa propre métadonnée) : son titre vient d'ici. Sans cela elle
// portait le même titre que l'accueil, donc un onglet, un favori et un lecteur d'écran ne la distinguaient pas.
export const metadata: Metadata = {
  title: "Sakia · Proof: our rule replayed on observed weather",
  description:
    "Sakia's irrigation rule replayed on observed weather in Kairouan: water pumped and days of thirst, against a fixed weekly schedule we defined. A simulation, not a field result.",
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
