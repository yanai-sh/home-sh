import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  setHeaders({
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    pragma: "no-cache",
    expires: "0",
  });

  return {};
};
