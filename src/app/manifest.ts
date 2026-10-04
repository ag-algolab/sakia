// Manifeste de l'application installable (Chrome : « Installer l'application » ; iPhone : « Sur l'écran d'accueil »).
// Les icônes (vert et terre) sont dans public/icons/.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sakia",
    short_name: "Sakia",
    // en anglais par défaut (le jury) ; l'appli parle anglais, arabe tunisien et français
    description: "When and how much to irrigate over the next 7 days, in English, Tunisian Arabic and French. Keeps working without internet after a first load.",
    lang: "en",
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
        name: "SMS phone",
        short_name: "SMS",
        description: "Try the plan by simulated SMS",
        url: "/phone",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
