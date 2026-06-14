import { resumePdfResponse } from '$lib/server/resume-pdf';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform?.env) {
    return new Response('Worker env is not configured.', { status: 503 });
  }
  return resumePdfResponse(platform.env, true);
};

export const HEAD: RequestHandler = async ({ platform }) => {
  if (!platform?.env) {
    return new Response(null, { status: 503 });
  }
  return resumePdfResponse(platform.env, false);
};
