import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireUser } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { profileUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = profileUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile) {
    throw createAppError(409, "Profile already exists for this user.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      ...body,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw createAppError(500, "Failed to create profile.", { cause: error.message });
  }

  appLogger.info(
    "Profile created.",
    buildRequestLogContext(event, {
      userId: user.id,
      profileId: data.id,
    }),
  );

  return { profile: data };
});
