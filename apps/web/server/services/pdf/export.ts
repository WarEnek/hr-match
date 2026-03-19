import type { H3Event } from 'h3'
import { chromium } from 'playwright'

import { createSupabaseAdminClient } from '~/server/services/supabase/admin'
import { createAppError } from '~/server/utils/errors'
import { appLogger, buildRequestLogContext } from '~/server/utils/logger'

export async function exportResumeToPdf(event: H3Event, resumeId: string, userId: string) {
  const config = useRuntimeConfig()
  const admin = createSupabaseAdminClient()
  const cookieHeader = getHeader(event, 'cookie') || ''
  const baseUrl = config.public.appUrl

  if (!baseUrl) {
    throw createAppError(500, 'NUXT_PUBLIC_APP_URL is missing.')
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        cookie: cookieHeader,
      },
    })
    const page = await context.newPage()
    const previewUrl = `${baseUrl}/resumes/${resumeId}/preview?print=1`

    appLogger.info(
      'Playwright PDF export started.',
      buildRequestLogContext(event, {
        resumeGenerationId: resumeId,
        previewUrl,
      }),
    )

    await page.goto(previewUrl, { waitUntil: 'networkidle' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    })

    const pdfPath = `${config.pdfBasePath}/${userId}/${resumeId}.pdf`
    const { error: uploadError } = await admin.storage
      .from(config.pdfStorageBucket)
      .upload(pdfPath, pdfBuffer, {
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      throw createAppError(500, 'Storage upload failed.', { cause: uploadError.message })
    }

    appLogger.info(
      'Playwright PDF export finished.',
      buildRequestLogContext(event, {
        resumeGenerationId: resumeId,
        pdfPath,
      }),
    )

    return { pdfPath }
  } catch (error) {
    appLogger.error(
      'Playwright PDF export failed.',
      buildRequestLogContext(event, {
        resumeGenerationId: resumeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    )
    throw error
  } finally {
    await browser.close()
  }
}
