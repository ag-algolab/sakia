// Les 24 gouvernorats tunisiens, localisés sur leur chef-lieu.
// Le point météo est celui du chef-lieu : approximation à l'échelle du gouvernorat, à dire dans l'interface.

export type Region = {
  id: string;
  nameFr: string;
  nameAr: string;
  lat: number;
  lon: number;
};

export const REGIONS: Region[] = [
  { id: "tunis", nameFr: "Tunis", nameAr: "تونس", lat: 36.8065, lon: 10.1815 },
  { id: "ariana", nameFr: "Ariana", nameAr: "أريانة", lat: 36.8665, lon: 10.1647 },
  { id: "ben-arous", nameFr: "Ben Arous", nameAr: "بن عروس", lat: 36.7531, lon: 10.2189 },
  { id: "manouba", nameFr: "Manouba", nameAr: "منوبة", lat: 36.8101, lon: 10.0863 },
  { id: "nabeul", nameFr: "Nabeul", nameAr: "نابل", lat: 36.4513, lon: 10.7357 },
  { id: "zaghouan", nameFr: "Zaghouan", nameAr: "زغوان", lat: 36.4029, lon: 10.1429 },
  { id: "bizerte", nameFr: "Bizerte", nameAr: "بنزرت", lat: 37.2744, lon: 9.8739 },
  { id: "beja", nameFr: "Béja", nameAr: "باجة", lat: 36.7256, lon: 9.1817 },
  { id: "jendouba", nameFr: "Jendouba", nameAr: "جندوبة", lat: 36.5011, lon: 8.7803 },
  { id: "le-kef", nameFr: "Le Kef", nameAr: "الكاف", lat: 36.1822, lon: 8.7148 },
  { id: "siliana", nameFr: "Siliana", nameAr: "سليانة", lat: 36.0849, lon: 9.3708 },
  { id: "sousse", nameFr: "Sousse", nameAr: "سوسة", lat: 35.8256, lon: 10.6084 },
  { id: "monastir", nameFr: "Monastir", nameAr: "المنستير", lat: 35.7643, lon: 10.8113 },
  { id: "mahdia", nameFr: "Mahdia", nameAr: "المهدية", lat: 35.5047, lon: 11.0622 },
  { id: "sfax", nameFr: "Sfax", nameAr: "صفاقس", lat: 34.7406, lon: 10.7603 },
  { id: "kairouan", nameFr: "Kairouan", nameAr: "القيروان", lat: 35.6781, lon: 10.0963 },
  { id: "kasserine", nameFr: "Kasserine", nameAr: "القصرين", lat: 35.1676, lon: 8.8365 },
  { id: "sidi-bouzid", nameFr: "Sidi Bouzid", nameAr: "سيدي بوزيد", lat: 35.0382, lon: 9.4849 },
  { id: "gabes", nameFr: "Gabès", nameAr: "قابس", lat: 33.8815, lon: 10.0982 },
  { id: "medenine", nameFr: "Médenine", nameAr: "مدنين", lat: 33.3549, lon: 10.5055 },
  { id: "tataouine", nameFr: "Tataouine", nameAr: "تطاوين", lat: 32.9297, lon: 10.4518 },
  { id: "gafsa", nameFr: "Gafsa", nameAr: "قفصة", lat: 34.425, lon: 8.7842 },
  { id: "tozeur", nameFr: "Tozeur", nameAr: "توزر", lat: 33.9197, lon: 8.1335 },
  { id: "kebili", nameFr: "Kébili", nameAr: "قبلي", lat: 33.7044, lon: 8.969 },
];

export const DEFAULT_REGION_ID = "kairouan";

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
