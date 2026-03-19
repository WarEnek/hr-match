import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { requireProfile } from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { resumeUpdateSchema } from '~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event)
  const resumeId = getRouterParam(event, 'id')
  const body = resumeUpdateSchema.parse(await readBody(event))
  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('resume_generations')
    .update({
      title: body.title,
      document_tree: body.document_tree,
    })
    .eq('id', resumeId)
    .eq('profile_id', profile.id)
    .select('*')
    .single()

  if (error) {
    throw createAppError(500, 'Failed to update resume draft.', { cause: error.message })
  }

  return { resume: data }
})
