import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const certificationId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const { data: existingCertification } = await supabase
    .from("certifications")
    .select("id")
    .eq("id", certificationId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingCertification) {
    throw createAppError(404, "Certification not found.");
  }

  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", certificationId)
    .eq("profile_id", profile.id);

  if (error) {
    throw createAppError(500, "Failed to delete certification.", { cause: error.message });
  }

  return { ok: true };
});
