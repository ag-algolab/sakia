// Manifeste de l'application installable (Chrome : « Installer l'application » ; iPhone : « Sur l'écran d'accueil »).
// Les icônes (vert et terre) sont dans public/icons/.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sakia",
    short_name: "Sakia",
    description: "Quand et combien irriguer pendant 7 jours, en français, en arabe et en anglais. Reste utilisable sans internet après un premier chargement.",
    lang: "fr",
    dir: "auto",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4efe6",
    theme_color: "#2f6b3a",
    categories: ["agriculture", "weather", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "Téléphone SMS",
        short_name: "SMS",
        description: "Essayer le plan par SMS simulé",
        url: "/phone",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
