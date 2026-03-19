import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { createAppError } from '~/server/utils/errors'
import { appLogger, buildRequestLogContext } from '~/server/utils/logger'
import { authSessionSchema } from '~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const body = authSessionSchema.parse(await readBody(event))
  const supabase = createSupabaseServerClient(event)

  const response = body.mode === 'sign_in'
    ? await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
    : await supabase.auth.signUp({ email: body.email, password: body.password })

  if (response.error) {
    appLogger.warn(
      'Supabase auth session mutation failed.',
      buildRequestLogContext(event, {
        mode: body.mode,
        providerStatus: response.error.status,
        error: response.error.message,
      }),
    )
    throw createAppError(400, response.error.message)
  }

  return {
    user: response.data.user,
  }
})
