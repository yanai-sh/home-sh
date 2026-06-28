import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/** Production splash is on `/` — keep this path as a stable redirect. */
export const load: PageServerLoad = () => {
  redirect(308, "/");
};
