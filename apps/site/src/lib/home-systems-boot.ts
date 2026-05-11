import { mountTelemetry } from '@lib/telemetry-client';
import { mountTelemetryStats } from '@lib/telemetry-stats-client';
import { mountWorkspaceWip } from '@lib/workspace-wip-client';

const HOME_CANVAS_ID = 'home-rust-canvas';

let mounted = false;

/** Lazy-mount WASM canvas, pane nav, and telemetry for `#systems` on `/`. */
export function mountHomeSystems(): void {
  if (mounted) return;
  if (!document.getElementById(HOME_CANVAS_ID)) return;
  mounted = true;
  mountWorkspaceWip({ canvas: HOME_CANVAS_ID });
  mountTelemetry();
  const systemsRoot = document.getElementById('systems');
  void mountTelemetryStats(systemsRoot);
}
