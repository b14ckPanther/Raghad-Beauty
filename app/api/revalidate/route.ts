import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Called by the admin after a save so the storefront shows the change at once. */
export async function POST() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false }, { status: 403 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
