import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => {
  return new Response(null, {
    status: 308,
    headers: { Location: "/resume.pdf" },
  });
};
