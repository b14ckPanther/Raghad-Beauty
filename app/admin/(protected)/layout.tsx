import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة التحكم - Raghad Beauty", robots: { index: false, follow: false } };

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) {
    return (
      <div className="login">
        <div className="box">
          <h1>لا تملكين صلاحية الدخول</h1>
          <p>هذا الحساب غير مسجل كمدير للمتجر.</p>
          <a className="btn" href="/admin/logout">تسجيل الخروج</a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
