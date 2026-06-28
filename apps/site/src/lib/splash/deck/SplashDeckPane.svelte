<script lang="ts">
  import ProjectDetail from "$lib/labs/ProjectDetail.svelte";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { portfolio as portfolioData } from "$lib/data/portfolio";
  import type { SubmitFunction } from "@sveltejs/kit";
  import type { DeckDest, DeckView } from "$lib/splash/deck/deck-model";
  import { DECK_PANE_COMPONENTS } from "$lib/splash/deck/deck-pane-components";

  type Portfolio = typeof portfolioData;

  let {
    dest,
    view,
    projectSlug,
    portfolio,
    splashProjects,
    projectsLayout,
    repoMeta,
    contactAction,
    contactFormLive,
    turnstileSiteKey,
    contactEnhance,
    paneOpen,
    paneAnimating,
    resumeLayout = "scroll",
    onProjectSelect,
  }: {
    dest: DeckDest;
    view: DeckView;
    projectSlug: string;
    portfolio: Portfolio;
    splashProjects: LabSplashProject[];
    projectsLayout: LabDemoLayout;
    repoMeta: Record<string, import("$lib/github-repo-meta").RepoMeta | null> | undefined;
    contactAction: string;
    contactFormLive: boolean;
    turnstileSiteKey: string;
    contactEnhance: SubmitFunction;
    paneOpen: boolean;
    paneAnimating: boolean;
    resumeLayout?: import("$lib/splash/resume-pdf").ResumeRenderMode;
    onProjectSelect: (slug: string) => void;
  } = $props();

  const activeProject = $derived(
    view === "project" ? splashProjects.find((p) => p.slug === projectSlug) : undefined,
  );

  const Pane = $derived(DECK_PANE_COMPONENTS[dest]);
</script>

{#if view === "project" && activeProject && repoMeta}
  <div class="deck-pane deck-pane--project" data-project-detail={projectSlug}>
    <ProjectDetail project={activeProject} {repoMeta} />
  </div>
{:else}
  <Pane
    {portfolio}
    {splashProjects}
    {projectsLayout}
    {repoMeta}
    {contactAction}
    {contactFormLive}
    {turnstileSiteKey}
    {contactEnhance}
    {paneOpen}
    {paneAnimating}
    {resumeLayout}
    {onProjectSelect}
  />
{/if}
