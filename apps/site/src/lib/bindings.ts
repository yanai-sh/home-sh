export async function secretValue(
  binding: { get?: () => Promise<string> } | string | undefined,
): Promise<string> {
  if (binding == null) return "";
  if (typeof binding === "string") return binding;
  try {
    return (await binding.get?.()) ?? "";
  } catch {
    // Secrets Store bindings are not populated in local `vite dev`; fall back to
    // .dev.vars / $env/dynamic/private via the caller.
    return "";
  }
}
