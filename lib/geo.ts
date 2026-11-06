// Rough village locations in Ludhiana district, for estimating pickup distances and times.
// Approximate coordinates; good enough to plan a day's run, not for navigation.
type Point = { lat: number; lng: number };

/** Where the pickup truck starts each morning (Ludhiana city). */
export const BASE: Point = { lat: 30.901, lng: 75.857 };

export const VILLAGE_COORDS: Record<string, Point> = {
  Dakha: { lat: 30.84, lng: 75.7 },
  Mullanpur: { lat: 30.858, lng: 75.689 },
  Sahnewal: { lat: 30.844, lng: 75.965 },
  Doraha: { lat: 30.8, lng: 76.028 },
  Raikot: { lat: 30.65, lng: 75.6 },
  Jagraon: { lat: 30.788, lng: 75.474 },
  Machhiwara: { lat: 30.917, lng: 76.2 },
  Payal: { lat: 30.723, lng: 76.067 },
};

/** Roads wind: straight-line distance × 1.3 is a common rural estimate. Whole km. */
export function roadKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * 6371 * Math.asin(Math.sqrt(h));
  return Math.max(1, Math.round(straight * 1.3));
}
