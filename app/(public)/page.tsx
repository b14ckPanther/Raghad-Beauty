import type { Metadata } from "next";

import { Storefront } from "@/features/storefront/Storefront";
import { createStore } from "@/features/storefront/engine";
import { getDictionary } from "@/lib/i18n";
import { getStore } from "@/lib/store-data";

import "./store.css";

/* Rebuilt in the background at most once a minute; the admin also triggers a
   rebuild after every save, so edits appear right away. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getStore();
  const title = settings.seoTitle || `${settings.storeName} - ${settings.storeNameAr}`;
  return {
    title,
    description: settings.seoDescription || settings.tagline,
    openGraph: { title, description: settings.seoDescription || settings.tagline, type: "website", locale: "ar", siteName: settings.storeName },
  };
}

export default async function HomePage() {
  const state = await getStore();
  const html = createStore(state, getDictionary(state.settings.locale)).html();
  return <Storefront state={state} html={html} />;
}
