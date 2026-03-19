import { createSupabaseAdminClient } from "~/server/services/supabase/admin";
import { appLogger } from "~/server/utils/logger";

export async function createResumePdfSignedUrl(pdfPath: string): Promise<string | null> {
  const config = useRuntimeConfig();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(config.pdfStorageBucket)
    .createSignedUrl(pdfPath, 60 * 60);

  if (error) {
    appLogger.warn("Failed to create signed PDF URL.", {
      pdfPath,
      error: error.message,
    });
    return null;
  }

  return data.signedUrl;
}
