"""Zones d'étude. Kairouan est l'ÉTUDE DE CAS (entraînement) ; les autres servent à tester si le modèle se TRANSPORTE, c'est-à-dire si
la méthode s'étend à d'autres régions d'Afrique sans rien changer d'autre que la zone. Tout le reste de la chaîne est global :
MODIS, Open-Meteo, ESA WorldCover couvrent toute l'Afrique."""

# bbox = (lon_min, lat_min, lon_max, lat_max) ; tile = tuile ESA WorldCover (3° x 3°, coin sud-ouest)
REGIONS = {
    "kairouan": dict(name="Kairouan, Tunisia (case study)", bbox=(9.7, 35.1, 10.5, 35.95), tile="N33E009", n=150, role="train", dry=(7, 8)),
    "sidi_bouzid": dict(name="Sidi Bouzid, Tunisia (near transfer)", bbox=(9.1, 34.6, 9.6, 35.0), tile="N33E009", n=60, role="transfer", dry=(7, 8)),
    "haouz": dict(name="Haouz (Marrakech), Morocco (far transfer, semi-arid)", bbox=(-8.6, 31.5, -7.6, 32.1), tile="N30W009", n=60, role="transfer", dry=(7, 8)),
    "gezira": dict(name="Gezira, Sudan (far transfer, irrigated Sahel)", bbox=(33.0, 14.0, 33.8, 14.8), tile="N12E033", n=60, role="transfer", dry=(2, 3)),
}
START, END = "2019-01-01", "2025-12-27"
