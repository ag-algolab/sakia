"""Exporte un modèle CatBoost (arbres symétriques, variables numériques seulement) vers un JSON compact que le navigateur rejoue sans serveur.
Usage : python export_ts.py <modele.json de CatBoost> <sortie.json> [lignes_de_test.csv attendu.json]
Format : { features: [noms], bias, scale, depth, trees: [{ f: [indices], b: [bords], v: [valeurs des feuilles] }] }"""
import json, sys

def compact(src, dst, digits=5):
    j = json.load(open(src))
    names = [f["feature_id"] if f.get("feature_id") else f"f{f['flat_feature_index']}" for f in j["features_info"]["float_features"]]
    # indice de variable dans la liste d'entrée = float_feature_index
    n = max(f["flat_feature_index"] for f in j["features_info"]["float_features"]) + 1
    order = [None] * n
    for f in j["features_info"]["float_features"]:
        order[f["flat_feature_index"]] = f.get("feature_id") or f"f{f['flat_feature_index']}"
    scale = j["scale_and_bias"][0]; bias = j["scale_and_bias"][1][0]
    trees = []
    for t in j["oblivious_trees"]:
        trees.append({"f": [s["float_feature_index"] for s in t["splits"]], "b": [float(f"{s['border']:.9g}") for s in t["splits"]], "v": [round(v * scale, digits) for v in t["leaf_values"]]})
    out = {"features": order, "bias": round(bias, digits + 2), "trees": trees}
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    return out

if __name__ == "__main__":
    o = compact(sys.argv[1], sys.argv[2])
    import os, gzip
    raw = open(sys.argv[2], "rb").read()
    print(f"{len(o['trees'])} arbres, profondeur {len(o['trees'][0]['f'])}, {len(raw)/1024:.0f} Ko ({len(gzip.compress(raw))/1024:.0f} Ko compressé)")
