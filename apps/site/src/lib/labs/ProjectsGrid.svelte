<script lang="ts">
  import ProjectCard from "./ProjectCard.svelte";
  import type { LabDemoLayout, LabSplashProject } from "./lab-projects";

  let {
    projects,
    layout,
    onselect,
  }: {
    projects: LabSplashProject[];
    layout: LabDemoLayout;
    onselect: (slug: string) => void;
  } = $props();
</script>

<div
  class="projects-grid"
  class:projects-grid--stack={layout === "cards-stack"}
  class:projects-grid--2col={layout === "cards-2col"}
  role="list"
>
  {#each projects as project (project.slug)}
    <div role="listitem">
      <ProjectCard {project} onclick={() => onselect(project.slug)} />
    </div>
  {/each}
</div>
