import { handleContactOptions, handleContactPost } from "$lib/server/contact";
import type { RequestHandler } from "./$types";

export const OPTIONS: RequestHandler = () => handleContactOptions();

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env) {
    return new Response(JSON.stringify({ error: "missing_env" }), { status: 503 });
  }
  return handleContactPost(request, platform.env);
};
