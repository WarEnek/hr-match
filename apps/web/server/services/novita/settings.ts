import type { H3Event } from 'h3'

import { createSupabaseServerClient } from '~/server/services/supabase/server'
import { decryptSecret } from '~/server/utils/crypto'

export async function getResolvedAiSettings(event: H3Event, userId: string) {
  const config = useRuntimeConfig()
  const supabase = createSupabaseServerClient(event)
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const encryptedKey = data?.api_key_encrypted || null
  const decryptedKey = encryptedKey && config.encryptionKey
    ? decryptSecret(encryptedKey, config.encryptionKey)
    : config.novitaApiKey

  return {
    provider: data?.provider || 'novita',
    baseUrl: data?.base_url || config.novitaBaseUrl,
    model: data?.model || config.novitaModel,
    apiKey: decryptedKey || config.novitaApiKey,
    temperature: data?.temperature ?? 0.2,
    maxTokens: data?.max_tokens ?? 900,
  }
}
