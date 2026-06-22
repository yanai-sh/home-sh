<script lang="ts">
  import type { LabSplashProject } from "./lab-projects";
  import { repoMetaFor, splashStatusLabel } from "./lab-projects";
  import { splashProjectLabel } from "$lib/splash-project-label";

  let {
    project,
    repoMeta,
  }: {
    project: LabSplashProject;
    repoMeta?: Record<string, import("$lib/github-repo-meta").RepoMeta | null>;
  } = $props();

  const meta = $derived(repoMetaFor(repoMeta, project.repo));
  const status = $derived(splashStatusLabel(project.splashStatus));
  const label = $derived(splashProjectLabel(project));
</script>

<article class="project-detail lab-project-detail">
  <div class="pane-scroll">
    <button type="button" class="lab-pane-back" data-back-to-projects>
      ← Projects
    </button>

    {#if project.splashImage}
      <div
        class="lab-project-detail__hero"
        class:lab-project-detail__hero--contain={project.splashImageFit === "contain"}
      >
        <div class="lab-project-detail__fit">
          <img src={project.splashImage} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    {/if}

    <header class="project-detail__head">
      <div class="project-detail__title-row">
        <h2>{label}</h2>
        {#if status}
          <span class="project-detail__status">{status}</span>
        {/if}
      </div>
      <p>{project.description}</p>
      {#if meta}
        <p class="project-detail__repo">
          <span>★ {meta.stars}</span>
        </p>
      {/if}
    </header>

    {#if project.problem}
      <section>
        <h3>Problem</h3>
        <p>{project.problem}</p>
      </section>
    {/if}
    {#if project.approach}
      <section>
        <h3>Approach</h3>
        <p>{project.approach}</p>
      </section>
    {/if}
    {#if project.outcome}
      <section>
        <h3>Outcome</h3>
        <p>{project.outcome}</p>
      </section>
    {/if}
    {#if project.tech?.length}
      <p class="project-detail__tech">{project.tech.join(" · ")}</p>
    {/if}
  </div>
</article>
