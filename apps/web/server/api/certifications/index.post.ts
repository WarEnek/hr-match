import type { CertificationRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { certificationUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const body = certificationUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("certifications")
    .insert({
      ...body,
      profile_id: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to create certification.", { cause: error?.message });
  }

  return { certification: data as CertificationRecord };
});
