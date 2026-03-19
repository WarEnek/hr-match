import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { requireUser } from '~/server/utils/auth'
import { createAppError } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const jobId = getRouterParam(event, 'id')
  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (error || !data) {
    throw createAppError(404, 'Export job not found.')
  }

  return { job: data }
})
