import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { vacancyCreateSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const body = vacancyCreateSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("vacancies")
    .insert({
      profile_id: profile.id,
      title: body.title,
      company: body.company,
      raw_text: body.raw_text,
      status: "created",
    })
    .select("*")
    .single();

  if (error) {
    throw createAppError(500, "Failed to create vacancy.", { cause: error.message });
  }

  return { vacancy: data };
});
