import { resumePdfResponse } from "$lib/server/resume-pdf";
import { resolveWorkerEnv } from "$lib/server/worker-env";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform }) => {
  return resumePdfResponse(resolveWorkerEnv(platform), true);
};

export const HEAD: RequestHandler = async ({ platform }) => {
  return resumePdfResponse(resolveWorkerEnv(platform), false);
};
