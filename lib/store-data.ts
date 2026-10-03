import "server-only";

import { createPublicClient } from "@/lib/supabase/server";

/* The storefront works on one plain object: collections keyed in camelCase,
   rows with camelCase fields. Tables and columns are snake_case in Postgres. */
export type Row = Record<string, any>;
export type StoreState = Record<string, any>;

export const COLLECTIONS: Record<string, string> = {
  brands: "brands",
  categories: "categories",
  needs: "needs",
  hairTypes: "hair_types",
  products: "products",
  regions: "regions",
  payments: "payments",
  promos: "promos",
  usageGuide: "usage_guide",
  sections: "sections",
  socials: "socials",
  nav: "nav_links",
};

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function camelRow(row: Row): Row {
  const out: Row = {};
  for (const k in row) out[camel(k)] = row[k];
  return out;
}

const DOC_DEFAULTS: Row = {
  settings: { storeName: "Raghad Beauty", storeNameAr: "رغد بيوتي", currency: "₪", locale: "ar", accent: "#b4125f", ink: "#26102b", paper: "#fbf7fa", whatsapp: "", orderNote: "", deliveryNote: "" },
  hero: { visible: true, title: "", text: "", autoplay: true },
  copy: {},
  footer: { about: "", rights: "جميع الحقوق محفوظة", creditLabel: "تصميم وتطوير", designerName: "نور", creditName: "Darb", creditUrl: "https://darb.co.il" },
  labels: { textures: {}, usages: {} },
};

/** Everything the public storefront renders, read with the anonymous key. */
export async function getStore(): Promise<StoreState> {
  const db = createPublicClient();
  const names = Object.keys(COLLECTIONS);
  const [docs, reviews, ...lists] = await Promise.all([
    db.from("site_content").select("key,value"),
    db.from("reviews").select("id,name,product,rating,text,photos,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(40),
    ...names.map((n) => db.from(COLLECTIONS[n]).select("*").order("sort_order")),
  ]);
  if (docs.error) throw new Error(`Could not load store content: ${docs.error.message}`);

  const state: StoreState = {};
  for (const key in DOC_DEFAULTS) state[key] = { ...DOC_DEFAULTS[key] };
  for (const d of docs.data ?? []) state[d.key] = { ...(DOC_DEFAULTS[d.key] ?? {}), ...(d.value as Row) };
  names.forEach((n, i) => {
    state[n] = (lists[i].data ?? []).map(camelRow);
  });
  state.products = state.products
    .filter((p: Row) => p.visible)
    .map(({ sourceNote: _note, createdAt: _at, ...p }: Row) => ({ ...p, price: p.price == null ? null : Number(p.price), compareAt: p.compareAt == null ? 0 : Number(p.compareAt) }));
  for (const key of ["regions", "hairTypes"]) state[key] = state[key].map((r: Row) => ({ ...r, fee: r.fee == null ? undefined : Number(r.fee), km: r.km == null ? undefined : Number(r.km), curl: r.curl == null ? undefined : Number(r.curl) }));
  state.reviews = (reviews.data ?? []).map((r) => ({ id: r.id, name: r.name, product: r.product, rating: r.rating, text: r.text, photos: r.photos ?? [], date: String(r.created_at).slice(0, 10) }));
  return state;
}
