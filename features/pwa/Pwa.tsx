"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "rb_pwa_later";
const WEEK = 7 * 864e5;

/** Registers the service worker and offers installing the store as an app. */
export function Pwa({ name }: { name: string }) {
  const [mode, setMode] = useState<"" | "prompt" | "ios">("");
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    let later = 0;
    try { later = Number(localStorage.getItem(KEY)) || 0; } catch {}
    if (standalone || Date.now() - later < WEEK) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      timer = setTimeout(() => setMode("prompt"), 12000);
    };
    const onInstalled = () => setMode("");
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) timer = setTimeout(() => setMode("ios"), 20000);

    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!mode) return null;

  const later = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setMode("");
  };
  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setMode("");
  };

  return (
    <aside className="pwa" role="dialog" aria-label="تثبيت التطبيق">
      <img src="/icons/icon-192.png" alt="" width={52} height={52} />
      <div className="pwa-t">
        <b>{name} على شاشتك</b>
        {mode === "ios" ? (
          <span>
            اضغطي زر المشاركة
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15.500V4.500M7.500 9 12 4.500 16.500 9M5 13v5.500A1.500 1.500 0 0 0 6.500 20h11a1.500 1.500 0 0 0 1.500-1.500V13" /></svg>
            ثم "إضافة إلى الشاشة الرئيسية".
          </span>
        ) : (
          <span>افتحي المتجر بضغطة واحدة، وسلتك محفوظة دائما.</span>
        )}
      </div>
      <div className="pwa-a">
        {mode === "prompt" ? <button className="btn" onClick={install}>تثبيت</button> : null}
        <button className="pwa-x" onClick={later}>{mode === "ios" ? "فهمت" : "لاحقا"}</button>
      </div>
    </aside>
  );
}
