export function contactFormAvailability(
  turnstileSiteKey: string | undefined,
  isDev = false,
): { contactFormLive: boolean; turnstileSiteKey: string } {
  const key = turnstileSiteKey?.trim() ?? "";
  return {
    contactFormLive: Boolean(key) && !isDev,
    turnstileSiteKey: key,
  };
}
