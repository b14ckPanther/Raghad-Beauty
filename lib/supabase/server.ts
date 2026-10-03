import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/config/env";

/** Cookie-aware client: carries the admin session on the server. */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component. The proxy refreshes the session.
        }
      },
    },
  });
}

/** Anonymous client for public storefront reads (no cookies, cacheable). */
export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createPlainClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
