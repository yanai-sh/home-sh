import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { WarpScene, WarpSceneState } from './scene/warp-scene';

type SceneRegistry = typeof globalThis & {
  __yanaiScrollSceneCleanup?: () => void;
  __yanaiScrollSceneStats?: FrameStats;
};

const reduceMotionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

interface FrameStats {
  frames: number;
  longFrames: number;
  maxFrameMs: number;
  lastFrameMs: number;
  lastSnapTarget: 'home' | 'contact' | undefined;
}

function canUseScene() {
  return globalThis.innerWidth >= 900 && globalThis.innerHeight >= 520;
}

function maxScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - globalThis.innerHeight);
}

function setSceneClass(active: boolean) {
  document.documentElement.classList.toggle('has-scroll-scene', active);
}

function clearDomProps(elements: Element[]) {
  for (const element of elements) {
    gsap.set(element, { clearProps: 'all' });
    if (element instanceof HTMLElement) {
      element.style.pointerEvents = '';
      element.inert = false;
      element.removeAttribute('aria-hidden');
    }
  }
}

export function mountScrollScene(): void {
  const registry = globalThis as SceneRegistry;
  registry.__yanaiScrollSceneCleanup?.();

  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement | null;
  const homeMotion = document.querySelector('.home-motion');
  const heroSlot = document.querySelector('.hero-headline-slot');
  const homeActions = document.querySelector('.home-actions');
  const resumeStage = document.querySelector('.resume-showcase');
  const contactStage = document.querySelector('.contact-stage');
  const contactLabel = document.querySelector('.contact-label');
  const contactForm = document.querySelector('.contact-form');
  const hasResumeFlow = Boolean(resumeStage);
  const requiredElements = hasResumeFlow
    ? [homeMotion, heroSlot, homeActions]
    : [homeMotion, heroSlot, homeActions, contactStage, contactLabel, contactForm];

  if (!canvas || requiredElements.some((element) => !element)) {
    setSceneClass(false);
    return;
  }
  const sceneCanvas = canvas;

  gsap.registerPlugin(ScrollTrigger);

  let scene: WarpScene | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let scrollTrigger: ScrollTrigger | undefined;
  let rafActive = false;
  let renderTickerActive = false;
  let resizeFrame = 0;
  let idleTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let snapTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let lastGestureDirection = 0;
  let gestureDistance = 0;
  let lastGestureSpeed = 0;
  let lastGestureTime = 0;
  let lastFrameTime = 0;
  let lastScrollY = 0;
  let lastScrollTime = 0;
  let setupTicket = 0;

  function onPageShowBfcache(event: PageTransitionEvent) {
    if (!event.persisted) return;
    ScrollTrigger.refresh(true);
    scene?.resize();
  }

  function onVisibilityResume() {
    if (document.visibilityState !== 'visible') return;
    ScrollTrigger.refresh();
    scene?.resize();
  }
  const debugFrames = new URLSearchParams(globalThis.location.search).has('scrollStats');
  const frameStats: FrameStats = {
    frames: 0,
    lastFrameMs: 0,
    lastSnapTarget: undefined,
    longFrames: 0,
    maxFrameMs: 0,
  };
  if (debugFrames) {
    registry.__yanaiScrollSceneStats = frameStats;
  }
  const state: WarpSceneState = {
    direction: 1,
    progress: 0,
    time: 0,
    velocity: 0,
  };
  const domElements = requiredElements as Element[];

  function resetScrollTracking() {
    lastScrollY = globalThis.scrollY;
    lastScrollTime = performance.now();
  }

  function onNativeScroll() {
    const y = globalThis.scrollY;
    const now = performance.now();
    const dy = y - lastScrollY;
    const dt = Math.max(1, now - lastScrollTime);
    const rawVel = (dy / dt) * 18;
    state.velocity = state.velocity * 0.82 + rawVel * 0.18;
    if (dy !== 0) {
      state.direction = Math.sign(dy);
    }
    lastScrollY = y;
    lastScrollTime = now;
    ScrollTrigger.update();
    requestSceneRender();
  }

  function onWheelChapterHint(event: WheelEvent) {
    if (hasResumeFlow) return;
    if (event.defaultPrevented) return;
    if (Math.abs(event.deltaY) < 0.5) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - lastGestureTime);
    lastGestureDirection = Math.sign(event.deltaY);
    gestureDistance += event.deltaY;
    lastGestureSpeed = Math.max(lastGestureSpeed, Math.abs(event.deltaY) / elapsed);
    lastGestureTime = now;

    if (snapTimer) {
      globalThis.clearTimeout(snapTimer);
    }
    snapTimer = globalThis.setTimeout(() => {
      snapTimer = undefined;
      snapToRestingChapter();
    }, 340);
  }

  function teardown() {
    setupTicket += 1;
    if (resizeFrame !== 0) {
      globalThis.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
    if (snapTimer) {
      globalThis.clearTimeout(snapTimer);
      snapTimer = undefined;
    }
    if (idleTimer) {
      globalThis.clearTimeout(idleTimer);
      idleTimer = undefined;
    }
    globalThis.removeEventListener('scroll', onNativeScroll);
    globalThis.removeEventListener('wheel', onWheelChapterHint);
    gsap.ticker.remove(renderScene);
    scrollTrigger?.kill();
    timeline?.kill();
    scene?.dispose();
    scrollTrigger = undefined;
    timeline = undefined;
    scene = undefined;
    lastFrameTime = 0;
    rafActive = false;
    renderTickerActive = false;
    setSceneClass(false);
    clearDomProps(domElements);
    ScrollTrigger.refresh();
  }

  function recordFrame(time: number) {
    if (!debugFrames) return;
    if (lastFrameTime !== 0) {
      const frameMs = (time - lastFrameTime) * 1000;
      frameStats.frames += 1;
      frameStats.lastFrameMs = Math.round(frameMs * 10) / 10;
      frameStats.maxFrameMs = Math.max(frameStats.maxFrameMs, frameStats.lastFrameMs);
      if (frameMs > 24) frameStats.longFrames += 1;
    }
    lastFrameTime = time;
  }

  function renderScene(time: number) {
    if (!scene || !rafActive) return;
    recordFrame(time);
    state.time = time;
    state.velocity *= 0.92;
    scene.render(state);
  }

  function stopRenderTicker() {
    if (!renderTickerActive) return;
    gsap.ticker.remove(renderScene);
    renderTickerActive = false;
    lastFrameTime = 0;
  }

  function startRenderTicker() {
    if (!rafActive || renderTickerActive) return;
    lastFrameTime = 0;
    gsap.ticker.add(renderScene);
    renderTickerActive = true;
  }

  function requestSceneRender() {
    startRenderTicker();
    if (idleTimer) {
      globalThis.clearTimeout(idleTimer);
    }
    idleTimer = globalThis.setTimeout(() => {
      idleTimer = undefined;
      if (Math.abs(state.velocity) < 0.018) {
        stopRenderTicker();
      } else {
        requestSceneRender();
      }
    }, 560);
  }

  function setContactAvailable(available: boolean) {
    if (hasResumeFlow) return;
    if (!(contactStage instanceof HTMLElement)) return;
    contactStage.style.pointerEvents = available ? 'auto' : 'none';
    contactStage.inert = !available;
    if (available) {
      contactStage.removeAttribute('aria-hidden');
    } else {
      contactStage.setAttribute('aria-hidden', 'true');
    }
  }

  function snapToRestingChapter() {
    if (hasResumeFlow || !canUseScene()) return;

    const limit = maxScrollY();
    if (limit <= 0) return;

    const scroll = globalThis.scrollY;
    const progress = scroll / limit;
    const movedQuickly = Math.abs(gestureDistance) >= 260 || lastGestureSpeed >= 1.05;
    let target = progress >= 0.5 ? limit : 0;
    if (lastGestureDirection > 0) {
      target = progress >= (movedQuickly ? 0.14 : 0.24) ? limit : 0;
    } else if (lastGestureDirection < 0) {
      target = progress <= (movedQuickly ? 0.86 : 0.76) ? 0 : limit;
    }

    frameStats.lastSnapTarget = target === 0 ? 'home' : 'contact';
    gestureDistance = 0;
    lastGestureSpeed = 0;

    if (Math.abs(target - scroll) < 2) return;

    if (reduceMotionQuery?.matches) {
      globalThis.scrollTo(0, target);
      return;
    }
    globalThis.scrollTo({ behavior: 'smooth', top: target });
  }

  async function setup() {
    teardown();

    if (reduceMotionQuery?.matches || !canUseScene()) {
      return;
    }

    const ticket = setupTicket;
    const { createWarpScene } = await import('./scene/warp-scene');
    if (ticket !== setupTicket || reduceMotionQuery?.matches || !canUseScene()) {
      return;
    }

    try {
      scene = createWarpScene(sceneCanvas);
    } catch {
      teardown();
      return;
    }

    setSceneClass(true);
    rafActive = true;
    resetScrollTracking();

    globalThis.addEventListener('scroll', onNativeScroll, { passive: true });
    if (!hasResumeFlow) {
      globalThis.addEventListener('wheel', onWheelChapterHint, { passive: true });
    }

    gsap.ticker.lagSmoothing(0);

    if (!hasResumeFlow) {
      setContactAvailable(false);

      gsap.set(contactStage, {
        opacity: 0,
        pointerEvents: 'none',
        rotateX: -8,
        scale: 0.97,
        transformOrigin: '50% 8%',
        y: 64,
        yPercent: -50,
        z: 0,
      });
      gsap.set([contactLabel, contactForm], {
        opacity: 0,
        y: 24,
      });
    }
    gsap.set(homeMotion, {
      opacity: 1,
      pointerEvents: 'auto',
      rotateX: 0,
      scale: 1,
      transformOrigin: '50% 72%',
      y: 0,
      z: 0,
    });
    gsap.set([heroSlot, homeActions], {
      opacity: 1,
      rotateX: 0,
      scale: 1,
      transformOrigin: '50% 50%',
      y: 0,
      z: 0,
    });

    timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        end: hasResumeFlow ? 'bottom top' : 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate(self) {
          state.progress = self.progress;
          if (hasResumeFlow) {
            if (homeMotion instanceof HTMLElement) {
              homeMotion.style.pointerEvents = self.progress > 0.78 ? 'none' : 'auto';
              homeMotion.inert = self.progress > 0.78;
            }
            requestSceneRender();
            return;
          }
          setContactAvailable(self.progress > 0.34);
          requestSceneRender();
        },
        scrub: 0.32,
        start: 'top top',
        trigger: hasResumeFlow ? '.chapter--home' : '.page-shell',
      },
    });
    scrollTrigger = timeline.scrollTrigger;

    if (hasResumeFlow) {
      timeline
        .to(homeMotion, { duration: 0.72, opacity: 0, rotateX: 18, scale: 0.95, y: -220 }, 0)
        .to(heroSlot, { duration: 0.56, opacity: 0.08, rotateX: 14, scale: 1.04, y: -64 }, 0)
        .to(homeActions, { duration: 0.48, opacity: 0, rotateX: 8, scale: 0.98, y: -38 }, 0);
    } else {
      timeline
        .to(homeMotion, { duration: 0.52, opacity: 0.16, rotateX: 20, scale: 0.95, y: -240 }, 0)
        .to(heroSlot, { duration: 0.42, opacity: 0.28, rotateX: 15, scale: 1.04, y: -56 }, 0)
        .to(homeActions, { duration: 0.36, opacity: 0.14, rotateX: 10, scale: 0.98, y: -34 }, 0)
        .to(
          contactStage,
          { duration: 0.24, opacity: 1, rotateX: 0, scale: 1, y: 0, yPercent: -50 },
          0,
        )
        .to(contactLabel, { duration: 0.2, opacity: 1, y: 0 }, 0.02)
        .to(contactForm, { duration: 0.2, opacity: 1, y: 0 }, 0.04);
    }

    scene.resize();
    scene.render(state);
    requestSceneRender();
    ScrollTrigger.refresh();
    onNativeScroll();
  }

  function scheduleResize() {
    if (resizeFrame !== 0) return;
    resizeFrame = globalThis.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (reduceMotionQuery?.matches || !canUseScene()) {
        setup();
        return;
      }
      scene?.resize();
      requestSceneRender();
      ScrollTrigger.refresh();
    });
  }

  setup();
  globalThis.addEventListener('resize', scheduleResize, { passive: true });
  globalThis.addEventListener('pageshow', onPageShowBfcache);
  document.addEventListener('visibilitychange', onVisibilityResume);
  reduceMotionQuery?.addEventListener('change', setup);

  registry.__yanaiScrollSceneCleanup = () => {
    globalThis.removeEventListener('resize', scheduleResize);
    globalThis.removeEventListener('pageshow', onPageShowBfcache);
    document.removeEventListener('visibilitychange', onVisibilityResume);
    reduceMotionQuery?.removeEventListener('change', setup);
    teardown();
    delete registry.__yanaiScrollSceneStats;
    delete registry.__yanaiScrollSceneCleanup;
  };
}
