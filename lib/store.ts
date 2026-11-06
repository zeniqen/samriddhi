// Persistence. Upstash Redis in production; an in-memory store for local dev and tests.
import { Redis } from "@upstash/redis";
import { buildSeedListings, SEED_BUYERS, SEED_FARMERS } from "./seed-data";
import { todayIST } from "./dates";
import type { Buyer, ConversationState, Farmer, Listing, Notification, Order } from "./types";

export interface Store {
  listListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  saveListing(l: Listing): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(o: Order): Promise<void>;
  listNotifications(farmerId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | null>;
  saveNotification(n: Notification): Promise<void>;
  getConversation(id: string): Promise<ConversationState | null>;
  saveConversation(c: ConversationState): Promise<void>;
  getFarmer(id: string): Promise<Farmer | null>;
  getBuyer(id: string): Promise<Buyer | null>;
  listFarmers(): Promise<Farmer[]>;
  listBuyers(): Promise<Buyer[]>;
  /** Run fn with exclusive access to one listing (prevents overselling). */
  withListingLock<T>(listingId: string, fn: () => Promise<T>): Promise<T>;
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

const people = {
  getFarmer: async (id: string) => SEED_FARMERS.find((f) => f.id === id) ?? null,
  getBuyer: async (id: string) => SEED_BUYERS.find((b) => b.id === id) ?? null,
  listFarmers: async () => SEED_FARMERS,
  listBuyers: async () => SEED_BUYERS,
};

export function createMemoryStore(today: string = todayIST()): Store {
  const listings = new Map(buildSeedListings(today).map((l) => [l.id, l]));
  const orders = new Map<string, Order>();
  const notifications = new Map<string, Notification>();
  const conversations = new Map<string, ConversationState>();
  const locks = new Map<string, Promise<unknown>>();
  const clone = <T>(x: T): T => structuredClone(x);

  return {
    ...people,
    listListings: async () => [...listings.values()].map(clone).sort(byNewest),
    getListing: async (id) => (listings.has(id) ? clone(listings.get(id)!) : null),
    saveListing: async (l) => void listings.set(l.id, clone(l)),
    getOrder: async (id) => (orders.has(id) ? clone(orders.get(id)!) : null),
    saveOrder: async (o) => void orders.set(o.id, clone(o)),
    listNotifications: async (farmerId) =>
      [...notifications.values()].filter((n) => n.farmerId === farmerId).map(clone).sort(byNewest),
    getNotification: async (id) => (notifications.has(id) ? clone(notifications.get(id)!) : null),
    saveNotification: async (n) => void notifications.set(n.id, clone(n)),
    getConversation: async (id) => (conversations.has(id) ? clone(conversations.get(id)!) : null),
    saveConversation: async (c) => void conversations.set(c.sessionId, clone(c)),
    withListingLock: (id, fn) => {
      const prev = locks.get(id) ?? Promise.resolve();
      const run = prev.then(fn, fn);
      locks.set(id, run.catch(() => undefined));
      return run;
    },
  };
}

function createRedisStore(redis: Redis): Store {
  let seeded: Promise<void> | null = null;
  const ensureSeed = () =>
    (seeded ??= (async () => {
      if (await redis.set("seeded", 1, { nx: true })) {
        for (const l of buildSeedListings()) {
          await redis.set(`listing:${l.id}`, l);
          await redis.sadd("listings", l.id);
        }
      }
    })());
  const many = async <T>(keys: string[]): Promise<T[]> =>
    keys.length ? ((await redis.mget<(T | null)[]>(...keys)).filter(Boolean) as T[]) : [];

  return {
    ...people,
    async listListings() {
      await ensureSeed();
      const ids = await redis.smembers("listings");
      return (await many<Listing>(ids.map((id) => `listing:${id}`))).sort(byNewest);
    },
    async getListing(id) {
      await ensureSeed();
      return redis.get<Listing>(`listing:${id}`);
    },
    async saveListing(l) {
      await redis.set(`listing:${l.id}`, l);
      await redis.sadd("listings", l.id);
    },
    getOrder: (id) => redis.get<Order>(`order:${id}`),
    saveOrder: async (o) => void (await redis.set(`order:${o.id}`, o)),
    async listNotifications(farmerId) {
      const ids = await redis.smembers(`notifs:${farmerId}`);
      return (await many<Notification>(ids.map((id) => `notification:${id}`))).sort(byNewest);
    },
    getNotification: (id) => redis.get<Notification>(`notification:${id}`),
    async saveNotification(n) {
      await redis.set(`notification:${n.id}`, n);
      await redis.sadd(`notifs:${n.farmerId}`, n.id);
    },
    getConversation: (id) => redis.get<ConversationState>(`conv:${id}`),
    saveConversation: async (c) => void (await redis.set(`conv:${c.sessionId}`, c, { ex: 86_400 })),
    async withListingLock(id, fn) {
      const key = `lock:${id}`;
      for (let attempt = 0; attempt < 30; attempt++) {
        if (await redis.set(key, 1, { nx: true, px: 3000 })) {
          try {
            return await fn();
          } finally {
            await redis.del(key);
          }
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Listing is busy, try again");
    },
  };
}

const g = globalThis as unknown as { __kisanStore?: Store };

export function getStore(): Store {
  if (g.__kisanStore) return g.__kisanStore;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  g.__kisanStore = url && token ? createRedisStore(new Redis({ url, token })) : createMemoryStore();
  return g.__kisanStore;
}
