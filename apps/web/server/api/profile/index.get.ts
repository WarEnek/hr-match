import { requireUser } from "~/server/utils/auth";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw createAppError(500, "Failed to load profile.", { cause: error.message });
  }

  return { profile: data };
});
