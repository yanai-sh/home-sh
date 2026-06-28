import type { Component } from "svelte";
import type { SubmitFunction } from "@sveltejs/kit";
import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
import { portfolio as portfolioData } from "$lib/data/portfolio";
import type { DeckDest } from "./deck-registry";
import ContactPane from "./ContactPane.svelte";
import ProjectsPane from "./ProjectsPane.svelte";
import ResumePaneViewer from "./ResumePaneViewer.svelte";

type Portfolio = typeof portfolioData;

import type { ResumeRenderMode } from "$lib/splash/resume-pdf";

export type DeckPaneSharedProps = {
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
  resumeLayout?: ResumeRenderMode;
  onProjectSelect: (slug: string) => void;
};

export const DECK_PANE_COMPONENTS: Record<DeckDest, Component<DeckPaneSharedProps>> = {
  resume: ResumePaneViewer,
  projects: ProjectsPane,
  contact: ContactPane,
};
