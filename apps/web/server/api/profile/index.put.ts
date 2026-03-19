import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { requireUser } from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'
import { profileUpsertSchema } from '~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = profileUpsertSchema.parse(await readBody(event))
  const supabase = createSupabaseServerClient(event)

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    throw createAppError(500, 'Failed to update profile.', { cause: error.message })
  }

  return { profile: data }
})
