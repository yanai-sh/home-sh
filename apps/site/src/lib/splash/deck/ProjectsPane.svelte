<script lang="ts">
  import ProjectsGrid from "$lib/labs/ProjectsGrid.svelte";
  import type { DeckPaneSharedProps } from "$lib/splash/deck/deck-pane-components";

  let {
    splashProjects,
    projectsLayout,
    onProjectSelect,
  }: Pick<DeckPaneSharedProps, "splashProjects" | "projectsLayout" | "onProjectSelect"> = $props();
</script>

<div class="deck-pane deck-pane--projects lab-projects-pane">
  <ProjectsGrid projects={splashProjects} layout={projectsLayout} onselect={onProjectSelect} />
</div>
