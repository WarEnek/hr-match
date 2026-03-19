import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw createAppError(400, error.message);
  }

  return { ok: true };
});
