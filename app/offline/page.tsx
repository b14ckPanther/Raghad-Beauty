import type { Metadata } from "next";

export const metadata: Metadata = { title: "لا يوجد اتصال - Raghad Beauty", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#26102b", color: "#fbeef7", textAlign: "center", fontFamily: "var(--font-stack)" }}>
      <div style={{ display: "grid", gap: 14, justifyItems: "center", maxWidth: 360 }}>
        <img src="/icons/icon-192.png" alt="" width={96} height={96} style={{ borderRadius: 24 }} />
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>لا يوجد اتصال بالإنترنت</h1>
        <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.8 }}>سلتك محفوظة على جهازك. عند عودة الاتصال افتحي المتجر من جديد لإكمال طلبك.</p>
        <a href="/" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 28px", borderRadius: 999, background: "#fff", color: "#26102b", fontWeight: 700, textDecoration: "none" }}>إعادة المحاولة</a>
      </div>
    </main>
  );
}
