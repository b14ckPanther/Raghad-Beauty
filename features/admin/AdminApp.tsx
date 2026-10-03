"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { mountAdmin } from "./engine";

type Row = Record<string, any>;

/* admin state key -> table */
const TABLES: Record<string, string> = {
  brands: "brands", categories: "categories", needs: "needs", hairTypes: "hair_types", products: "products",
  coupons: "coupons", regions: "regions", payments: "payments", promos: "promos", usageGuide: "usage_guide",
  sections: "sections", socials: "socials", nav: "nav_links", packages: "packages", deals: "deals",
};
const DOCS = ["settings", "hero", "copy", "footer", "labels"];

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toState = (row: Row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), v]));
const toDb = (row: Row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== "createdAt").map(([k, v]) => [snake(k), v === "" && (k === "expires" || k === "ends") ? null : v]));

function fit(img: HTMLImageElement, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const s = Math.min((w * 0.94) / img.width, (h * 0.96) / img.height);
  const dw = img.width * s, dh = img.height * s;
  canvas.getContext("2d")!.drawImage(img, (w - dw) / 2, h - dh - h * 0.015, dw, dh);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/webp", 0.86));
}

export function AdminApp({ email }: { email: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cleanup: (() => void) | undefined;
    let gone = false;

    const must = async <T,>(q: PromiseLike<{ data: T; error: { message: string } | null }>) => {
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    };

    const db = {
      saveRow: (key: string, row: Row, index: number) => must(supabase.from(TABLES[key]).upsert({ ...toDb(row), sort_order: index })),
      saveOrder: (key: string, rows: Row[]) => must(supabase.from(TABLES[key]).upsert(rows.map((r, i) => ({ ...toDb(r), sort_order: i })))),
      deleteRow: (key: string, id: string) => must(supabase.from(TABLES[key]).delete().eq("id", id)),
      saveDoc: (key: string, value: Row) => must(supabase.from("site_content").upsert({ key, value, updated_at: new Date().toISOString() })),
      updateReview: (id: string, patch: Row) => must(supabase.from("reviews").update(patch).eq("id", id)),
      deleteReview: (id: string) => must(supabase.from("reviews").delete().eq("id", id)),
      revalidate: () => fetch("/api/revalidate", { method: "POST" }).then(() => undefined, () => undefined),
      async uploadProductImage(file: File) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const base = `products/${crypto.randomUUID()}`;
        const out: Record<string, string> = {};
        for (const [name, w, h] of [["img", 640, 740], ["thumb", 208, 240]] as const) {
          const path = `${base}${name === "thumb" ? "-s" : ""}.webp`;
          const up = await supabase.storage.from("media").upload(path, await fit(img, w, h), { contentType: "image/webp", cacheControl: "31536000" });
          if (up.error) throw new Error(up.error.message);
          out[name] = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
        }
        URL.revokeObjectURL(img.src);
        return out;
      },
    };

    (async () => {
      const keys = Object.keys(TABLES);
      const [docs, reviews, ...lists] = await Promise.all([
        must(supabase.from("site_content").select("key,value")),
        must(supabase.from("reviews").select("*").order("created_at", { ascending: false })),
        ...keys.map((k) => must(supabase.from(TABLES[k]).select("*").order("sort_order"))),
      ]);
      const state: Row = {};
      DOCS.forEach((k) => (state[k] = {}));
      (docs as Row[]).forEach((d) => (state[d.key] = d.value));
      state.labels = { textures: {}, usages: {}, ...state.labels };
      keys.forEach((k, i) => (state[k] = (lists[i] as Row[]).map((r) => { const { sortOrder: _s, ...row } = toState(r); return row; })));
      state.reviews = (reviews as Row[]).map((r) => ({ ...r, photos: r.photos ?? [], date: String(r.created_at).slice(0, 10) }));
      if (gone || !host.current) return;
      cleanup = mountAdmin(host.current, state, db, {
        email,
        signOut: async () => {
          await supabase.auth.signOut();
          window.location.href = "/admin/login";
        },
      });
    })().catch((e: Error) => setError(e.message));

    return () => {
      gone = true;
      cleanup?.();
    };
  }, [email]);

  if (error) return <p style={{ padding: 24 }}>تعذر تحميل البيانات: {error}</p>;
  return <div ref={host}><p style={{ padding: 24, color: "#75627b" }}>جار التحميل...</p></div>;
}
