import { getHeader } from "h3";

import { processEmbeddingJobs } from "~/server/services/embeddings/processor";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = getHeader(event, "x-worker-token") || "";

  if (!config.internalWorkerToken || token !== config.internalWorkerToken) {
    throw createAppError(401, "Unauthorized worker request.");
  }

  const result = await processEmbeddingJobs({
    event,
    limit: 10,
  });

  return {
    ok: true,
    ...result,
  };
});
