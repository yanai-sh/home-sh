<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const project = $derived(data.project);
  const repoUrl = $derived.by((): string | undefined => {
    if (project.repo) return `https://github.com/${project.repo}`;
    if ('externalUrl' in project && typeof project.externalUrl === 'string') {
      return project.externalUrl;
    }
    return undefined;
  });
</script>

<article class="document-panel prose">
  <header class="document-panel__head">
    <p class="document-eyebrow">{project.category}</p>
    <h1>{project.title}</h1>
    <p>{project.description}</p>
    {#if repoUrl}
      <p><a href={repoUrl} target="_blank" rel="noopener noreferrer">Source</a></p>
    {/if}
  </header>

  {#if project.problem}
    <section>
      <h2>Problem</h2>
      <p>{project.problem}</p>
    </section>
  {/if}
  {#if project.approach}
    <section>
      <h2>Approach</h2>
      <p>{project.approach}</p>
    </section>
  {/if}
  {#if project.outcome}
    <section>
      <h2>Outcome</h2>
      <p>{project.outcome}</p>
    </section>
  {/if}
  {#if project.tech?.length}
    <p class="project-detail__tech">{project.tech.join(' · ')}</p>
  {/if}

  {#if project.content}
    <div class="document-content">
      {@html project.content}
    </div>
  {/if}
</article>

<p class="document-back"><a href="/">← Home</a></p>
