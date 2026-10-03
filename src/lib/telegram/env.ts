// Pour les scripts hors Next : charge .env.local (Next le fait déjà pour les routes).

export function loadLocalEnv(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fichier absent : les variables viennent peut-être de l'environnement
  }
}
