import { AdminApp } from "@/features/admin/AdminApp";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <AdminApp email={String(data?.claims?.email ?? "")} />;
}
