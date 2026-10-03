"use client";

import { useEffect, useRef } from "react";

import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

import { createStore } from "./engine";

type Props = { state: Record<string, any>; html: string };

/** Server-rendered storefront markup, made interactive by the engine. */
export function Storefront({ state, html }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const supabase = createClient();
    const store = createStore(state, getDictionary(state.settings.locale));

    return store.hydrate(host.current, {
      async checkCoupon(code: string) {
        const { data, error } = await supabase.rpc("check_coupon", { p_code: code });
        if (error) throw error;
        return data;
      },
      async submitReview(review: { name: string; product: string; rating: number; text: string }, photos: Blob[]) {
        const urls: string[] = [];
        for (const blob of photos) {
          const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
          const up = await supabase.storage.from("review-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (up.error) throw up.error;
          urls.push(supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl);
        }
        const { error } = await supabase.from("reviews").insert({ ...review, photos: urls, status: "pending" });
        if (error) throw error;
      },
    });
  }, [state]);

  return <div ref={host} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
