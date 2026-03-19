import type { H3Event } from "h3";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";

export async function getOptionalUser(event: H3Event) {
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    appLogger.warn(
      "Supabase auth.getUser failed.",
      buildRequestLogContext(event, { providerStatus: error.status }),
    );
    return null;
  }

  if (data.user) {
    event.context.userId = data.user.id;
  }

  return data.user ?? null;
}

export async function requireUser(event: H3Event) {
  const user = await getOptionalUser(event);

  if (!user) {
    throw createAppError(401, "Unauthorized.");
  }

  return user;
}

export async function requireProfile(event: H3Event) {
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

  if (!data) {
    throw createAppError(404, "Profile not found.");
  }

  return data;
}
