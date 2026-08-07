/**
 * Pure scale/axis helpers for the SVG charts. No react-native imports so they
 * stay trivially testable and reusable.
 */

/** Round `value` up to a "nice" axis maximum (1/2/5 × 10ⁿ). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const frac = value / base;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * base;
}

/** Equally spaced tick values from 0 to max, inclusive. */
export function buildTicks(max: number, tickCount: number): number[] {
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push((max / tickCount) * i);
  }
  return ticks;
}

/** Compact numeric label: 1200 → "1.2k", 12300 → "12.3k". */
export function formatCompact(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

/** Smooth-ish polyline path string from points (for line charts). */
export function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y}`;
  }
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

/** Area path from a line, closing down to a baseline. */
export function buildAreaPath(
  points: { x: number; y: number }[],
  baselineY: number
): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
