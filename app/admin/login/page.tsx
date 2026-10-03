import type { Metadata } from "next";

import { LoginForm } from "./login-form";

import "../admin.css";

export const metadata: Metadata = { title: "دخول لوحة التحكم - Raghad Beauty", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="login">
      <div className="box">
        <h1>لوحة تحكم رغد بيوتي</h1>
        <p>سجلي الدخول لإدارة المتجر.</p>
        <LoginForm />
        <a href="/" style={{ color: "var(--mute)", fontSize: ".9rem" }}>العودة إلى المتجر</a>
      </div>
    </div>
  );
}
