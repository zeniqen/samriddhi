import { addDays, todayIST } from "./dates";
import type { Buyer, Crop, Farmer, Listing } from "./types";

// Real place names in Ludhiana district; every person and business is fictional.
export const VILLAGES = ["Dakha", "Mullanpur", "Sahnewal", "Doraha", "Raikot", "Jagraon", "Machhiwara", "Payal"];

export const CROPS: Crop[] = ["tomato", "onion", "potato"];

export const SEED_FARMERS: Farmer[] = [
  { id: "f1", name: "Ramesh Kumar", village: "Dakha", lang: "hi", phone: "+91 90000 00001" },
  { id: "f2", name: "Sunita Devi", village: "Sahnewal", lang: "hi", phone: "+91 90000 00002" },
  { id: "f3", name: "Mohan Lal", village: "Doraha", lang: "hi", phone: "+91 90000 00003" },
  { id: "f4", name: "Gurpreet Singh", village: "Mullanpur", lang: "pa", phone: "+91 90000 00004" },
  { id: "f5", name: "Harjit Kaur", village: "Jagraon", lang: "pa", phone: "+91 90000 00005" },
];

export const SEED_BUYERS: Buyer[] = [
  { id: "b1", name: "Hotel Sagar Dhaba", type: "restaurant", area: "Model Town, Ludhiana" },
  { id: "b2", name: "Punjab Rasoi Caterers", type: "restaurant", area: "Sarabha Nagar, Ludhiana" },
  { id: "b3", name: "Sharma Kirana Store", type: "kirana", area: "Ghumar Mandi, Ludhiana" },
];

/** Built fresh so pickup dates stay in the future whatever day the demo runs. */
export function buildSeedListings(today: string = todayIST()): Listing[] {
  const rows: [string, string, number, number, number][] = [
    // id, farmerId, kg, ₹/kg, pickup in N days
    ["l1", "f1", 300, 14, 1],
    ["l2", "f2", 150, 15, 2],
    ["l3", "f3", 200, 12, 1],
    ["l4", "f4", 250, 16, 3],
    ["l5", "f5", 100, 18, 2],
    ["l6", "f1", 80, 13, 4],
    ["l7", "f3", 120, 17, 3],
    ["l8", "f4", 50, 15, 1],
  ];
  return rows.map(([id, farmerId, kg, price, inDays], i) => {
    const farmer = SEED_FARMERS.find((f) => f.id === farmerId)!;
    return {
      id,
      farmerId,
      crop: "tomato",
      quantityKg: kg,
      remainingKg: kg,
      askPricePerKg: price,
      village: farmer.village,
      pickupDate: addDays(today, inDays),
      status: "live",
      transcriptOriginal: "",
      transcriptEnglish: "",
      createdAt: new Date(Date.parse(`${today}T03:00:00Z`) - i * 3_600_000).toISOString(),
    };
  });
}

export const SEED_LISTINGS: Listing[] = buildSeedListings();
