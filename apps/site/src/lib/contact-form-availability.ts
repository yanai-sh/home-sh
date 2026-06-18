export function contactFormAvailability(
  turnstileSiteKey: string | undefined,
  isDev = false,
): { canUseContactForm: boolean; contactFormLive: boolean; turnstileSiteKey: string } {
  const key = turnstileSiteKey?.trim() ?? "";
  return {
    canUseContactForm: true,
    contactFormLive: Boolean(key) && !isDev,
    turnstileSiteKey: key,
  };
}
