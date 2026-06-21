<script lang="ts">
  export type SplashVariantId = "hybrid" | "instrument" | "typographic";

  let {
    variant,
    title,
    description,
    recommended = false,
  }: {
    variant: SplashVariantId;
    title: string;
    description: string;
    recommended?: boolean;
  } = $props();
</script>

<article class="variant-mock" data-variant={variant}>
  <header class="variant-mock__head">
    <h2 class="variant-mock__title">{title}</h2>
    {#if recommended}
      <span class="variant-mock__badge">Recommended</span>
    {/if}
  </header>

  <div class="variant-mock__frame" aria-hidden="true">
    <div class="variant-mock__ambient">
      {#if variant === "instrument"}
        <div class="variant-mock__grid variant-mock__grid--dense"></div>
        <svg class="variant-mock__flow" viewBox="0 0 320 480" preserveAspectRatio="none">
          <path d="M 0 240 L 96 240 L 144 168 L 240 168 L 320 112" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M 0 336 L 72 336 L 120 384 L 216 384 L 320 432" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6" />
        </svg>
        <span class="variant-mock__node variant-mock__node--bright"></span>
        <span class="variant-mock__node variant-mock__node--dim"></span>
      {/if}
    </div>

    <div class="variant-mock__stage">
      <h3 class="variant-mock__name">Yanai Klugman</h3>
      <p class="variant-mock__role">Software &amp; Systems Engineer</p>
      <nav class="variant-mock__nav">
        <span>Resume</span>
        <span>Contact</span>
        <span>WinMint</span>
      </nav>
    </div>
  </div>

  <p class="variant-mock__desc">{description}</p>
</article>

<style>
  .variant-mock {
    display: grid;
    gap: 0.85rem;
  }

  .variant-mock__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
  }

  .variant-mock__title {
    margin: 0;
    font: 600 1rem/1.2 var(--font-heading);
    letter-spacing: -0.02em;
  }

  .variant-mock__badge {
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-accent-text);
    font: 500 0.65rem/1 var(--font-body);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .variant-mock__frame {
    position: relative;
    aspect-ratio: 2 / 3;
    max-height: 32rem;
    border: 1px solid var(--color-rule-strong);
    border-radius: 0.75rem;
    overflow: hidden;
    background: #0a0e14;
  }

  :global([data-theme='light']) .variant-mock__frame {
    background: #f4f0ea;
  }

  .variant-mock__ambient {
    position: absolute;
    inset: 0;
    color: color-mix(in srgb, var(--color-accent-text) 55%, transparent);
  }

  .variant-mock__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--color-rule) 35%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-rule) 35%, transparent) 1px, transparent 1px);
    background-size: 2.5rem 2.5rem;
  }

  .variant-mock__grid--light {
    opacity: 0.45;
    background-size: 3.25rem 3.25rem;
  }

  .variant-mock__grid--dense {
    opacity: 0.65;
    background-size: 1.35rem 1.35rem;
  }

  .variant-mock__flow {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .variant-mock__flow--slow path {
    animation: flow-drift 14s ease-in-out infinite alternate;
  }

  .variant-mock[data-variant='instrument'] .variant-mock__flow path:first-child {
    animation: flow-drift 8s ease-in-out infinite alternate;
  }

  .variant-mock__node {
    position: absolute;
    border-radius: 50%;
    background: var(--color-accent-text);
  }

  .variant-mock__node--pulse {
    left: 52%;
    top: 66%;
    width: 0.5rem;
    height: 0.5rem;
    opacity: 0.55;
    animation: node-pulse 3s ease-in-out infinite;
  }

  .variant-mock__node--bright {
    left: 45%;
    top: 35%;
    width: 0.65rem;
    height: 0.65rem;
    opacity: 0.75;
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent-text) 40%, transparent);
  }

  .variant-mock__node--dim {
    left: 62%;
    top: 35%;
    width: 0.35rem;
    height: 0.35rem;
    opacity: 0.4;
  }

  .variant-mock__stage {
    position: relative;
    z-index: 1;
    padding: clamp(1.25rem, 4vw, 2rem);
  }

  .variant-mock__name {
    margin: 0;
    font: 650 clamp(1.5rem, 4vw, 2rem)/0.96 var(--font-heading);
    letter-spacing: -0.032em;
  }

  .variant-mock__role {
    margin: 0.55rem 0 0;
    color: var(--color-subtext);
    font-size: 0.82rem;
  }

  .variant-mock__nav {
    display: grid;
    gap: 0.45rem;
    margin-top: 1.25rem;
    font: 550 0.88rem var(--font-body);
    letter-spacing: -0.01em;
  }

  .variant-mock__desc {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.82rem;
    line-height: 1.55;
  }

  @keyframes flow-drift {
    from {
      transform: translateY(0);
      opacity: 0.45;
    }
    to {
      transform: translateY(-6px);
      opacity: 0.85;
    }
  }

  @keyframes node-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.45;
    }
    50% {
      transform: scale(1.35);
      opacity: 0.75;
    }
  }
</style>
