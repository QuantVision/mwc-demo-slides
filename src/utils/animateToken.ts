const pathLengthCache = new Map<string, number>();

export function getPathLength(pathId: string, pathRefs: Map<string, SVGPathElement>): number {
  const key = `${pathId}:${pathRefs.get(pathId) ? 'ready' : 'none'}`;
  const cached = pathLengthCache.get(key);
  if (cached) return cached;
  const el = pathRefs.get(pathId);
  if (!el) return 0;
  const len = el.getTotalLength();
  pathLengthCache.set(key, len);
  return len;
}

export function pointAlongPath(
  pathId: string,
  t: number,
  pathRefs: Map<string, SVGPathElement>
): { x: number; y: number } {
  const el = pathRefs.get(pathId);
  if (!el) return { x: 0, y: 0 };
  const len = getPathLength(pathId, pathRefs);
  const bounded = Math.max(0, Math.min(1, t));
  const pt = el.getPointAtLength(len * bounded);
  return { x: pt.x, y: pt.y };
}

export function cubicEaseInOut(t: number): number {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - ((-2 * t + 2) ** 3) / 2;
}

export function tokenRadius(msgType: string): number {
  if (msgType === 'ANOMALY') return 9;
  if (msgType === 'KPI') return 6;
  if (msgType === 'TICKET') return 8;
  return 7;
}

