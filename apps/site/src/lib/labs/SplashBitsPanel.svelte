<script lang="ts">
  import { Dialog, Separator } from 'bits-ui';
  import { splashPreviewCopy as copy } from '$lib/labs/splash-copy';

  let resumeOpen = $state(false);
</script>

<div class="lab-panel">
  <div>
    <p class="lab-panel__label">Option B</p>
    <h2 class="lab-panel__title">Bits UI primitives</h2>
    <p class="lab-panel__note">
      Headless Dialog + Separator for flyouts. You still write all splash styling — Bits UI adds
      focus trap, escape key, and ARIA wiring.
    </p>
  </div>

  <div class="lab-panel__frame">
    <div class="lab-panel__field" aria-hidden="true"></div>
    <div class="lab-panel__stage splash-tokens__scrim">
      <div class="splash-tokens">
        <header>
          <h1 class="splash-tokens__name">{copy.name}</h1>
          <p class="splash-tokens__role">{copy.tagline}</p>
          <p class="splash-tokens__location">{copy.location}</p>
        </header>
        <p class="splash-tokens__deck">{copy.lede}</p>

        <nav class="lab-bits__links" aria-label="Site navigation">
          <div class="lab-bits__block">
            <Dialog.Root bind:open={resumeOpen}>
              <Dialog.Trigger class="lab-bits__trigger">Resume</Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay class="lab-bits__overlay" />
                <Dialog.Content class="lab-bits__sheet">
                  <div class="lab-bits__sheet-head">
                    <Dialog.Title class="lab-bits__sheet-title">resume.pdf</Dialog.Title>
                    <Dialog.Close class="lab-bits__close" aria-label="Close">×</Dialog.Close>
                  </div>
                  <Dialog.Description class="lab-bits__sheet-body">
                    {copy.resumeBlurb}
                  </Dialog.Description>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <button type="button" class="lab-bits__trigger">Contact</button>
          </div>

          <Separator.Root class="lab-bits__sep" />

          <div class="lab-bits__block">
            {#each copy.projects as project (project.slug)}
              <button type="button" class="lab-bits__trigger">{project.title}</button>
            {/each}
          </div>

          <Separator.Root class="lab-bits__sep" />

          <div class="lab-bits__block">
            <a class="lab-bits__link" href={copy.sourceUrl} target="_blank" rel="noopener">
              View source
            </a>
          </div>
        </nav>
      </div>
    </div>
  </div>
</div>
