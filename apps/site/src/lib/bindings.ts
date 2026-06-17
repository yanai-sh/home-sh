export async function secretValue(
  binding: { get?: () => Promise<string> } | string | undefined,
): Promise<string> {
  if (binding == null) return "";
  if (typeof binding === "string") return binding;
  return binding.get?.() ?? "";
}
