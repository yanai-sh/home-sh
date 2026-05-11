import { mountTelemetry } from '@lib/telemetry-client';
import { mountTelemetryStats } from '@lib/telemetry-stats-client';
import { mountWorkspaceWip } from '@lib/workspace-wip-client';

const HOME_WIP_IDS = {
  canvas: 'home-rust-canvas',
  searchTrigger: 'home-search-trigger',
  searchClose: 'home-search-close',
  searchPanel: 'home-search-panel',
  searchInput: 'home-search-input',
  searchResults: 'home-search-results',
} as const;

let mounted = false;

/** Lazy-mount WASM canvas, search, pane nav, and telemetry for `#systems` on `/`. */
export function mountHomeSystems(): void {
  if (mounted) return;
  if (!document.getElementById(HOME_WIP_IDS.canvas)) return;
  mounted = true;
  mountWorkspaceWip(HOME_WIP_IDS);
  mountTelemetry();
  const systemsRoot = document.getElementById('systems');
  void mountTelemetryStats(systemsRoot);
}
