import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Raghad Beauty - رغد بيوتي",
    short_name: "رغد بيوتي",
    description: "منتجات العناية بالشعر من رغد، مع الطلب عبر واتساب.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#26102b",
    theme_color: "#26102b",
    categories: ["shopping", "beauty"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "المنتجات", url: "/?source=pwa#catalog", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "التقييمات", url: "/?source=pwa#reviews", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
