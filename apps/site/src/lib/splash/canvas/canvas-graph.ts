/** Trick-room canvas — horizontal ring (resume ↔ home ↔ projects) + contact south pole with west/east peers. */

export type PanDir = "west" | "east" | "north" | "south";

export type CanvasCell = "resume" | "projects" | "contact";

export type PanTarget = { kind: "rest" } | { kind: "cell"; cell: CanvasCell };

export const CANVAS_CELLS: readonly CanvasCell[] = ["resume", "projects", "contact"] as const;

export const CANVAS_NAV: { id: CanvasCell; label: string }[] = [
  { id: "resume", label: "Resume" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

const REST_PAN: Record<PanDir, PanTarget | null> = {
  west: { kind: "cell", cell: "resume" },
  east: { kind: "cell", cell: "projects" },
  south: { kind: "cell", cell: "contact" },
  north: null,
};

const CELL_PAN: Record<CanvasCell, Partial<Record<PanDir, PanTarget>>> = {
  resume: {
    east: { kind: "rest" },
    west: { kind: "cell", cell: "projects" },
    south: { kind: "cell", cell: "contact" },
  },
  projects: {
    west: { kind: "rest" },
    east: { kind: "cell", cell: "resume" },
    south: { kind: "cell", cell: "contact" },
  },
  contact: {
    north: { kind: "rest" },
    west: { kind: "cell", cell: "resume" },
    east: { kind: "cell", cell: "projects" },
  },
};

export function panFromRest(dir: PanDir): PanTarget | null {
  return REST_PAN[dir];
}

export function panFromCell(cell: CanvasCell, dir: PanDir): PanTarget | null {
  return CELL_PAN[cell][dir] ?? null;
}

export function panTarget(isRest: boolean, cell: CanvasCell | null, dir: PanDir): PanTarget | null {
  if (isRest) return panFromRest(dir);
  if (!cell) return null;
  return panFromCell(cell, dir);
}

export function panDirFromKey(key: string): PanDir | null {
  switch (key) {
    case "ArrowLeft":
      return "west";
    case "ArrowRight":
      return "east";
    case "ArrowUp":
      return "north";
    case "ArrowDown":
      return "south";
    default:
      return null;
  }
}

export function isCanvasCell(value: string): value is CanvasCell {
  return CANVAS_CELLS.includes(value as CanvasCell);
}

export function cellLabel(cell: CanvasCell): string {
  return CANVAS_NAV.find((item) => item.id === cell)?.label ?? cell;
}

export type CanvasNavFrom = { isRest: true; cell: null } | { isRest: false; cell: CanvasCell };

/** Compass direction for nav clicks / deep links from Rest or an open cell. */
export function panDirToCell(from: CanvasNavFrom, dest: CanvasCell): PanDir {
  if (from.isRest) {
    if (dest === "resume") return "west";
    if (dest === "projects") return "east";
    return "south";
  }
  if (dest === "contact") return "south";
  if (dest === "resume") return from.cell === "projects" ? "east" : "west";
  return "east";
}
