"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (error) {
      setError("البريد أو كلمة المرور غير صحيحة.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form className="form" onSubmit={onSubmit} style={{ textAlign: "start" }}>
      <label className="f">
        <span>البريد الإلكتروني</span>
        <input type="text" inputMode="email" name="email" autoComplete="username" dir="ltr" style={{ textAlign: "right" }} required />
      </label>
      <label className="f">
        <span>كلمة المرور</span>
        <input type="password" name="password" autoComplete="current-password" dir="ltr" style={{ textAlign: "right" }} required />
      </label>
      {error ? <p className="e" role="alert" style={{ color: "var(--err)", fontWeight: 600 }}>{error}</p> : null}
      <button className="btn" style={{ minHeight: 52 }} disabled={busy}>{busy ? "جار الدخول..." : "تسجيل الدخول"}</button>
    </form>
  );
}
