// Geometry for the mobile radial menu. Coordinates are relative to the control's bottom-right corner (x right, y down),
// matching how the nodes are positioned in CSS (`right:2px; bottom:2px`, then translated).
const H = 52, GAP = 8, CORE = 56, PAGE_MARGIN = 16;
export const widthOf = (label: string) => Math.max(52, Math.round(label.length * 7.5 + 28));
type Rect = { l: number; t: number; r: number; b: number };
const hit = (a: Rect, b: Rect) => a.l < b.r + GAP && b.l < a.r + GAP && a.t < b.b + GAP && b.t < a.b + GAP;

// A true quarter-circle fan for up to 4 destinations at the smallest radius where no two nodes (or the core) collide
// and everything stays on screen. Returns null when it cannot fit; the caller then uses a scrollable vertical stack,
// so adding vocations never produces an overlapping or off-screen menu.
export function arcLayout(labels: string[], viewportW = 360): { x: number; y: number }[] | null {
  const n = labels.length;
  if (n === 0 || n > 4) return null;
  const core: Rect = { l: -CORE, r: 0, t: -CORE, b: 0 };
  for (let R = 92; R <= 220; R += 4) {
    const pts = labels.map((_, i) => { const a = n === 1 ? Math.PI / 4 : ((Math.PI / 2) * i) / (n - 1); return { x: -Math.cos(a) * R, y: -Math.sin(a) * R }; });
    const rects: Rect[] = pts.map((p, i) => ({ l: p.x - 2 - widthOf(labels[i]), r: p.x - 2, t: p.y - 2 - H, b: p.y - 2 }));
    const clear = rects.every((a, i) => !hit(a, core) && rects.slice(i + 1).every((b) => !hit(a, b)));
    const onScreen = rects.every((a) => a.l > -(viewportW - PAGE_MARGIN - 8));
    if (clear && onScreen) return pts;
  }
  return null;
}
