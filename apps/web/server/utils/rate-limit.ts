import type { H3Event } from 'h3'

import { createAppError } from '~/server/utils/errors'

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function enforceRateLimit(
  event: H3Event,
  key: string,
  options: { limit: number; windowMs: number },
) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const compositeKey = `${key}:${event.context.userId || ip}`
  const now = Date.now()
  const currentEntry = rateLimitStore.get(compositeKey)

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(compositeKey, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return
  }

  if (currentEntry.count >= options.limit) {
    throw createAppError(429, 'Too many requests. Please retry later.')
  }

  currentEntry.count += 1
  rateLimitStore.set(compositeKey, currentEntry)
}
