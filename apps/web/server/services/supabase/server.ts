import { createServerClient } from "@supabase/ssr";
import type { H3Event } from "h3";

import { createAppError } from "~/server/utils/errors";

export function createSupabaseServerClient(event: H3Event) {
  const config = useRuntimeConfig();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw createAppError(500, "Supabase environment variables are missing.");
  }

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const cookie of cookies) {
          setCookie(event, cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}
