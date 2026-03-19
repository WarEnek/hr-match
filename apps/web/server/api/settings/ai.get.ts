import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const supabase = createSupabaseServerClient(event)
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    settings: data
      ? {
          provider: data.provider,
          base_url: data.base_url,
          model: data.model,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          has_api_key: Boolean(data.api_key_encrypted),
        }
      : null,
  }
})
