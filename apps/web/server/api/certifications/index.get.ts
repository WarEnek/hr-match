import type { CertificationRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("profile_id", profile.id)
    .order("issued_at", { ascending: false });

  if (error) {
    throw createAppError(500, "Failed to load certifications.", { cause: error.message });
  }

  return {
    certifications: (data || []) as CertificationRecord[],
  };
});
