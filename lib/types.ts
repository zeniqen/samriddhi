export type Lang = "hi" | "pa";
export type Crop = "tomato" | "onion" | "potato";

export type ListingFields = {
  crop?: Crop;
  quantityKg?: number;
  askPricePerKg?: number;
  village?: string;
  /** YYYY-MM-DD, IST */
  pickupDate?: string;
};

export type PriceSplit = {
  farmerPerKg: number;
  partnerPerKg: number;
  bufferPerKg: number;
  platformPerKg: number;
  buyerPerKg: number;
};

export type Farmer = { id: string; name: string; village: string; lang: Lang; phone: string };
export type Buyer = { id: string; name: string; type: "restaurant" | "kirana"; area: string };

export type Listing = Required<ListingFields> & {
  id: string;
  farmerId: string;
  remainingKg: number;
  status: "live" | "verified" | "sold_out";
  transcriptOriginal: string;
  transcriptEnglish: string;
  createdAt: string;
};

export type Order = {
  id: string;
  listingId: string;
  buyerId: string;
  quantityKg: number;
  split: PriceSplit;
  status: "placed";
  createdAt: string;
};

export type Notification = {
  id: string;
  farmerId: string;
  orderId: string;
  textEnglish: string;
  textLocal: string;
  heard: boolean;
  createdAt: string;
};

export type Intent = "fill" | "question" | "confirm" | "correct";
export type LlmTurn = { updates: ListingFields; replyEnglish: string; intent: Intent };

export type ConversationState = {
  sessionId: string;
  lang: Lang;
  farmerId: string;
  fields: ListingFields;
  history: { role: "farmer" | "assistant"; text: string }[];
  turns: number;
  transcriptOriginal: string;
  transcriptEnglish: string;
};
