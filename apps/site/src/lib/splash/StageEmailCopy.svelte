<script lang="ts">
  import { SITE_EMAIL } from '@config/site';

  let copied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let liveMessage = $state('');

  const resetCopied = (): void => {
    copied = false;
    liveMessage = '';
  };

  const scheduleReset = (): void => {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetCopied, 2600);
  };

  const copyEmail = async (): Promise<void> => {
    clearTimeout(resetTimer);

    try {
      await navigator.clipboard.writeText(SITE_EMAIL);
      copied = true;
      liveMessage = `${SITE_EMAIL} copied to clipboard`;
      scheduleReset();
    } catch {
      copied = false;
      liveMessage = SITE_EMAIL;
    }
  };
</script>

<div class="glyph-copy" data-copied={copied ? 'true' : 'false'}>
  <button
    type="button"
    class="glyph glyph--stroke glyph-copy__trigger"
    aria-label="Copy email address"
    aria-expanded={copied}
    onclick={copyEmail}
  >
    <svg aria-hidden="true"><use href="#icon-mail" /></svg>
  </button>

  <div class="glyph-copy__panel">
    <div class="glyph-copy__line">
      <div class="glyph-copy__swap">
        <span class="glyph-copy__address">{SITE_EMAIL}</span>
        <span class="glyph-copy__status" aria-hidden={!copied}>Copied</span>
      </div>
    </div>
  </div>

  <span class="sr-only" aria-live="polite">{liveMessage}</span>
</div>
