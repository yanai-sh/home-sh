<script lang="ts">
  import { splashPreviewCopy as copy } from '$lib/labs/splash-copy';

  let flyoutOpen = $state(false);

  function openResume(): void {
    flyoutOpen = true;
  }

  function closeFlyout(): void {
    flyoutOpen = false;
  }
</script>

<div class="lab-panel">
  <div>
    <p class="lab-panel__label">Option A</p>
    <h2 class="lab-panel__title">Splash token block</h2>
    <p class="lab-panel__note">
      One CSS token file drives type, links, scrim, and flyout motion. No component library — matches
      how yanai.sh works today.
    </p>
  </div>

  <div class="lab-panel__frame">
    <div class="lab-panel__field" aria-hidden="true"></div>
    <div class="lab-panel__stage">
      <div class="splash-tokens splash-tokens__scrim" class:is-flyout-open={flyoutOpen}>
        <div class="splash-tokens__stage-copy">
          <header>
            <h1 class="splash-tokens__name">{copy.name}</h1>
            <p class="splash-tokens__role">{copy.tagline}</p>
            <p class="splash-tokens__location">{copy.location}</p>
          </header>
          <p class="splash-tokens__deck">{copy.lede}</p>

          <nav class="splash-tokens__links" aria-label="Site navigation">
            <div class="splash-tokens__block">
              <button type="button" class="splash-tokens__action" onclick={openResume}>
                Resume
              </button>
              <button type="button" class="splash-tokens__action">Contact</button>
            </div>
            <div class="splash-tokens__block">
              {#each copy.projects as project (project.slug)}
                <button type="button" class="splash-tokens__action">{project.title}</button>
              {/each}
            </div>
            <div class="splash-tokens__block">
              <a class="splash-tokens__action" href={copy.sourceUrl} target="_blank" rel="noopener">
                View source
              </a>
            </div>
          </nav>
        </div>

        <aside class="splash-tokens__flyout" aria-label="Resume preview">
          <div class="splash-tokens__flyout-head">
            <span>resume.pdf</span>
            <button type="button" class="splash-tokens__action" onclick={closeFlyout}>Close</button>
          </div>
          <p class="splash-tokens__flyout-body">{copy.resumeBlurb}</p>
        </aside>
      </div>
    </div>
  </div>
</div>
