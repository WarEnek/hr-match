import type { CertificationRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { certificationUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const certificationId = getRouterParam(event, "id");
  const body = certificationUpsertSchema.parse(await readBody(event));
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

  const { data, error } = await supabase
    .from("certifications")
    .update(body)
    .eq("id", certificationId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update certification.", { cause: error?.message });
  }

  return { certification: data as CertificationRecord };
});
