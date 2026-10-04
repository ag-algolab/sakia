// Rejoue dans le navigateur (ou sur le serveur) un modèle CatBoost à arbres symétriques exporté par ml/export_ts.py.
// Aucune dépendance, aucun appel réseau : la prédiction est une somme de valeurs de feuilles. Variables NUMÉRIQUES seulement.
// Comparaison en précision simple (float32) comme CatBoost : sinon des valeurs proches d'un seuil basculent de feuille.

export type CompactTree = { f: number[]; b: number[]; v: number[] };
export type CompactModel = { features: string[]; bias: number; trees: CompactTree[] };

export function predict(model: CompactModel, input: Record<string, number>): number {
  const x = model.features.map((name) => {
    const v = input[name];
    if (!Number.isFinite(v)) throw new Error(`variable manquante : ${name}`);
    return Math.fround(v);
  });
  let sum = model.bias;
  for (const t of model.trees) {
    let idx = 0;
    for (let k = 0; k < t.f.length; k++) if (x[t.f[k]] > Math.fround(t.b[k])) idx |= 1 << k;
    sum += t.v[idx];
  }
  return sum;
}
