import { runMatchPipeline } from '~/server/services/scoring/match'
import { requireProfile } from '~/server/utils/auth'
import { enforceRateLimit } from '~/server/utils/rate-limit'

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event)
  const vacancyId = getRouterParam(event, 'vacancyId') as string
  enforceRateLimit(event, 'vacancy-match', { limit: 20, windowMs: 60_000 })
  const result = await runMatchPipeline(event, profile.id, vacancyId)

  return result
})
