import { createClient } from '@supabase/supabase-js'

import { createAppError } from '~/server/utils/errors'

export function createSupabaseAdminClient() {
  const config = useRuntimeConfig()

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createAppError(500, 'Supabase service role configuration is missing.')
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
