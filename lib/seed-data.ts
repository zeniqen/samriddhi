import { addDays, todayIST } from "./dates";
import type { Buyer, Crop, Farmer, Listing } from "./types";

// Real place names in Ludhiana district; every person and business is fictional.
export const VILLAGES = ["Dakha", "Mullanpur", "Sahnewal", "Doraha", "Raikot", "Jagraon", "Machhiwara", "Payal"];

/** How each village is written in Devanagari and Gurmukhi (speech transcripts keep these intact). */
export const VILLAGE_NATIVE: Record<string, string[]> = {
  Dakha: ["दाखा", "ਦਾਖਾ"],
  Mullanpur: ["मुल्लांपुर", "मुल्लानपुर", "ਮੁੱਲਾਂਪੁਰ"],
  Sahnewal: ["साहनेवाल", "ਸਾਹਨੇਵਾਲ"],
  Doraha: ["दोराहा", "ਦੋਰਾਹਾ"],
  Raikot: ["रायकोट", "ਰਾਏਕੋਟ"],
  Jagraon: ["जगरांव", "जगराओं", "ਜਗਰਾਉਂ"],
  Machhiwara: ["माछीवाड़ा", "ਮਾਛੀਵਾੜਾ"],
  Payal: ["पायल", "ਪਾਇਲ"],
};

export const SEED_FARMERS: Farmer[] = [
  { id: "f1", name: "Ramesh Kumar", village: "Dakha", lang: "hi", phone: "+91 90000 00001" },
  { id: "f2", name: "Sunita Devi", village: "Sahnewal", lang: "hi", phone: "+91 90000 00002" },
  { id: "f3", name: "Mohan Lal", village: "Doraha", lang: "hi", phone: "+91 90000 00003" },
  { id: "f4", name: "Gurpreet Singh", village: "Mullanpur", lang: "pa", phone: "+91 90000 00004" },
  { id: "f5", name: "Harjit Kaur", village: "Jagraon", lang: "pa", phone: "+91 90000 00005" },
];

/** The pickup partner farmers call to arrange collection. Placeholder number, like the farmers' (fictional). */
export const PICKUP_PARTNER = { name: "Balwinder Singh", phone: "+91 90000 00099" };

export const SEED_BUYERS: Buyer[] = [
  { id: "b1", name: "Hotel Sagar Dhaba", type: "restaurant", area: "Model Town, Ludhiana" },
  { id: "b2", name: "Punjab Rasoi Caterers", type: "restaurant", area: "Sarabha Nagar, Ludhiana" },
  { id: "b3", name: "Sharma Kirana Store", type: "kirana", area: "Ghumar Mandi, Ludhiana" },
];

/** Built fresh so pickup dates stay in the future whatever day the demo runs. */
export function buildSeedListings(today: string = todayIST()): Listing[] {
  const rows: [string, string, Crop, number, number, number][] = [
    // id, farmerId, crop, kg, ₹/kg, pickup in N days
    ["l1", "f1", "tomato", 300, 14, 1],
    ["l2", "f2", "cauliflower", 150, 15, 2],
    ["l3", "f3", "potato", 200, 12, 1],
    ["l4", "f4", "kinnow", 250, 22, 3],
    ["l5", "f5", "carrot", 100, 18, 2],
    ["l6", "f1", "radish", 80, 10, 4],
    ["l7", "f3", "tomato", 120, 17, 3],
    ["l8", "f4", "spinach", 50, 15, 1],
  ];
  return rows.map(([id, farmerId, crop, kg, price, inDays], i) => {
    const farmer = SEED_FARMERS.find((f) => f.id === farmerId)!;
    return {
      id,
      farmerId,
      crop,
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
