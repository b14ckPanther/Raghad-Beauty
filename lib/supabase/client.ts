import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/config/env";

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
