/** Scale every PDF page to fit inside a fixed viewport (no in-pane scroll). */

export type PageSize = { width: number; height: number };

export function computeResumeFitScale(
  pages: PageSize[],
  maxWidth: number,
  maxHeight: number,
  gapPx = 10,
): number {
  if (pages.length === 0 || maxWidth <= 0 || maxHeight <= 0) return 1;

  const maxPageWidth = Math.max(...pages.map((page) => page.width));
  const totalHeight = pages.reduce(
    (sum, page, index) => sum + page.height + (index > 0 ? gapPx : 0),
    0,
  );

  const scaleW = maxWidth / maxPageWidth;
  const scaleH = maxHeight / totalHeight;
  return Math.min(scaleW, scaleH);
}
