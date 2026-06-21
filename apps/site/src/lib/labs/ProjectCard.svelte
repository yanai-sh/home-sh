<script lang="ts">
  import type { LabSplashProject } from "./lab-projects";
  import { splashStatusLabel } from "./lab-projects";
  import { splashProjectLabel } from "$lib/splash-project-label";

  let {
    project,
    onclick,
  }: {
    project: LabSplashProject;
    onclick: () => void;
  } = $props();

  const status = $derived(splashStatusLabel(project.splashStatus));
  const label = $derived(splashProjectLabel(project));
</script>

<button
  type="button"
  class="project-card"
  data-project-card={project.slug}
  data-open-project={project.slug}
  onclick={onclick}
>
  <div
    class="project-card__media"
    class:project-card__media--contain={project.splashImageFit === "contain"}
  >
    {#if project.splashImage}
      <div class="project-card__fit">
        <img src={project.splashImage} alt="" loading="lazy" decoding="async" />
      </div>
    {:else}
      <div class="project-card__placeholder" aria-hidden="true">
        <span>{project.slug}</span>
      </div>
    {/if}
  </div>
  <div class="project-card__body">
    <div class="project-card__head">
      <h3 class="project-card__title">{label}</h3>
      {#if status}
        <span class="project-card__status">{status}</span>
      {/if}
    </div>
    <p class="project-card__desc">{project.description}</p>
  </div>
</button>
